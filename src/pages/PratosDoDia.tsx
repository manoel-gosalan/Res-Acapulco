// src/pages/PratosDoDia.tsx
import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";

import { openWhatsAppSimple } from "@/lib/whatsapp";
import terraMarImage from "@/assets/terra-mar.jpg";
import grelhadoMistoImage from "@/assets/grelhado-misto.jpg";
import mariscadaImage from "@/assets/mariscada.jpg";

import { getDailyMenu } from "@/services/menu.service";
import { lisbonYYYYMMDD } from "@/lib/date";
import { useCart } from "@/contexts/CartContext";

import { listActiveSides } from "@/services/sides.service";
import { SidesModal } from "@/components/cart/SidesModal";

/**
 * Portion define a "porção lógica" do prato / acompanhamento.
 * - half: 1 pax / 1/2 dose
 * - full: 2-3 pax / 1 dose
 */
type Portion = "half" | "full";

/**
 * Modelo de prato vindo do menu do dia.
 * OBS: sides_enabled e sides_free_count podem vir do banco null/undefined.
 */
type DailyDish = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;

  sides_enabled?: boolean | null;
  sides_free_count?: number | null;

  /**
   * Se você já estiver a guardar isso no banco, use.
   * Se não estiver, a gente calcula por name (regra do MVP).
   */
  portion_type?: Portion | null;
};

/**
 * SideItem que o SidesModal precisa receber
 */
type SideItem = {
  id: string;
  name: string;
  active: boolean;
  portion: Portion; // ✅ obrigatório
};

/**
 * Itens simples (ex: sobremesas/bebidas) para adicionar ao carrinho.
 * Mantém o MVP profissional: quando tiver no DB, você só troca a origem.
 */
type SimpleCatalogItem = {
  id: string;
  name: string;
  price: number;
  note?: string;
};

/**
 * Regra provisória do MVP:
 * Se o prato começa com "1/2", tratamos como half.
 */
function isHalfDishName(name: string): boolean {
  const v = (name ?? "").trim().toLowerCase();
  return v.startsWith("1/2");
}

/**
 * Parse de boolean robusto:
 * evita bugs quando o Supabase/SQL retornar 0/1 ou string.
 */
function parseBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "t" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "f" || s === "no") return false;
  }
  return null;
}

/**
 * Normaliza o retorno do join do Supabase (menu_items vem como array de 1).
 */
function normalizeMenuItem(menu_items: unknown): DailyDish | null {
  if (!menu_items) return null;

  const item = Array.isArray(menu_items) ? menu_items[0] : menu_items;
  if (!item || typeof item !== "object") return null;

  const m = item as Record<string, unknown>;

  const id = String(m.id ?? "");
  const name = String(m.name ?? "");

  const portion_type =
      m.portion_type === "half" || m.portion_type === "full"
          ? (m.portion_type as Portion)
          : null;

  return {
    id,
    name,
    description: m.description ? String(m.description) : null,
    price: typeof m.price === "number" ? m.price : null,
    image_url: m.image_url ? String(m.image_url) : null,

    sides_enabled: parseBoolean(m.sides_enabled),
    sides_free_count:
        typeof m.sides_free_count === "number" ? m.sides_free_count : null,

    portion_type,
  };
}

/**
 * Linha de observação única para o pedido (MVP).
 * Aqui a observação é só para registrar acompanhamentos escolhidos.
 */
function formatSidesObservation(params: {
  dishName: string;
  sidesById: Map<string, string>;
  freeSideIds: string[];
  extras: Array<{ sideId: string; size: Portion; quantity: number }>;
}) {
  const { dishName, sidesById, freeSideIds, extras } = params;

  const freeNames = freeSideIds
      .map((id) => sidesById.get(id))
      .filter(Boolean) as string[];

  const extraParts = extras
      .filter((x) => x.quantity > 0)
      .map((x) => {
        const name = sidesById.get(x.sideId) ?? "Acomp";
        const sizeLabel = x.size === "half" ? "1/2 dose" : "1 dose";
        return `${name} (${sizeLabel}) x${x.quantity}`;
      });

  if (!freeNames.length && !extraParts.length) return `${dishName}: sem guarnição`;

  const blocks: string[] = [];
  if (freeNames.length) blocks.push(`Grátis: ${freeNames.join(", ")}`);
  if (extraParts.length) blocks.push(`Extras: ${extraParts.join(" | ")}`);

  return `${dishName}: ${blocks.join(" | ")}`;
}

function DishButton({
                      dish,
                      onClick,
                    }: {
  dish: DailyDish;
  onClick: (dish: DailyDish) => void;
}) {
  return (
      <button
          type="button"
          onClick={() => onClick(dish)}
          className="flex justify-between items-center p-3 bg-background rounded-lg hover:bg-muted transition-colors border border-border"
      >
        <span className="text-foreground text-left">{dish.name}</span>
        <span className="text-primary font-semibold">
        {dish.price != null ? `${Number(dish.price).toFixed(2)}€` : "Consultar"}
      </span>
      </button>
  );
}

/**
 * Seção expansível do “mini-menu” (acompanhamentos/bebidas/sobremesas)
 */
type ExtrasSectionKey = "sides" | "drinks" | "desserts";

export default function PratosDoDia() {
  const { addItem, openCart } = useCart();
  const day = useMemo(() => lisbonYYYYMMDD(), []);

  // pratos do dia
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
      Array<{
        id: string;
        day: string;
        group_key: string;
        menu_item_id: string;
        menu_items: unknown;
      }>
  >([]);

  // acompanhamentos do dia
  const [dailySides, setDailySides] = useState<SideItem[]>([]);
  const [loadingSides, setLoadingSides] = useState(true);

  // modal
  const [sidesOpen, setSidesOpen] = useState(false);
  const [pendingDish, setPendingDish] = useState<DailyDish | null>(null);
  const [pendingPortion, setPendingPortion] = useState<Portion>("full");

  // ✅ seção expandida (accordion)
  const [extrasOpen, setExtrasOpen] = useState<ExtrasSectionKey>("sides");

  const formattedDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("pt-PT", {
      timeZone: "Europe/Lisbon",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // catálogo MVP (hardcoded) — quando tiver DB, troca a fonte
  const desserts: SimpleCatalogItem[] = useMemo(
      () => [
        { id: "dessert-mousse", name: "Mousse de chocolate", price: 1.3 },
        {
          id: "dessert-fatia-bolo",
          name: "Fatia de bolo",
          price: 1.9,
          note: "Opções: cheesecake, bolo bolacha c/ leite condensado",
        },
      ],
      []
  );

  // carregar pratos do dia
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await getDailyMenu(day);
        if (!cancelled) setRows(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [day]);

  // carregar sides do dia
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingSides(true);
      try {
        const sides = await listActiveSides(day);
        if (!cancelled) setDailySides(sides ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setDailySides([]);
      } finally {
        if (!cancelled) setLoadingSides(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [day]);

  // agrupar pratos por categoria
  const grouped = useMemo(() => {
    const g = {
      peixe: [] as DailyDish[],
      carne: [] as DailyDish[],
      grelhados: [] as DailyDish[],
    };

    for (const r of rows) {
      const item = normalizeMenuItem(r.menu_items);
      if (!item) continue;

      const key = r.group_key as keyof typeof g;
      if (g[key]) g[key].push(item);
    }

    return g;
  }, [rows]);

  const hasAny =
      grouped.peixe.length || grouped.carne.length || grouped.grelhados.length;

  function addDishDirect(dish: DailyDish) {
    addItem({
      productId: dish.id,
      name: dish.name,
      price: dish.price ?? undefined,
    });
    openCart();
  }

  /**
   * Clique no prato:
   * - Se não tem sides -> adiciona direto
   * - Se tem sides -> abre modal
   */
  const handlePickDish = (dish: DailyDish) => {
    const enabled = dish.sides_enabled === true;

    if (!enabled) {
      addDishDirect(dish);
      return;
    }

    // Se o admin não definiu acompanhamentos hoje -> fallback direto
    if (!loadingSides && dailySides.length === 0) {
      addDishDirect(dish);
      return;
    }

    // Escolha da porção:
    const portion: Portion =
        dish.portion_type ?? (isHalfDishName(dish.name) ? "half" : "full");

    setPendingDish(dish);
    setPendingPortion(portion);
    setSidesOpen(true);
  };

  function finalizeAddWithSides(result: {
    freeSideIds: string[];
    extras: Array<{ sideId: string; size: Portion; quantity: number }>;
  }) {
    if (!pendingDish) return;

    const sidesById = new Map(dailySides.map((s) => [s.id, s.name]));
    const obsLine = formatSidesObservation({
      dishName: pendingDish.name,
      sidesById,
      freeSideIds: result.freeSideIds,
      extras: result.extras,
    });

    addItem({
      productId: pendingDish.id,
      name: pendingDish.name,
      price: pendingDish.price ?? undefined,
      note: obsLine,
    });

    setSidesOpen(false);
    setPendingDish(null);
    openCart();
  }

  /**
   * Acompanhamento avulso
   */
  function addSideAvulso(side: SideItem, portion: Portion) {
    const unit = portion === "half" ? 3 : 4;
    const label = portion === "half" ? "1/2 dose" : "1 dose";

    addItem({
      productId: `side-avulso-${side.id}-${portion}`,
      name: `${side.name} (${label})`,
      price: unit,
    });

    openCart();
  }

  /**
   * Add item simples (sobremesa/bebida).
   * Mantém o “padrão empresa”: um ponto único para gerar productId e comportamento.
   */
  function addSimpleItem(item: SimpleCatalogItem) {
    addItem({
      productId: item.id,
      name: item.note ? `${item.name} — ${item.note}` : item.name,
      price: item.price,
    });
    openCart();
  }

  const handleOrderSpecial = (dishName: string) => {
    openWhatsAppSimple(`Olá! Gostaria de encomendar: ${dishName}`);
  };

  const especialidades = [
    {
      id: "terra-mar",
      name: "Terra Mar",
      description: "O melhor do mar e da terra",
      image: terraMarImage,
    },
    {
      id: "grelhado-misto",
      name: "Grelhado Misto Especial",
      description: "Para 2 ou mais pessoas",
      image: grelhadoMistoImage,
    },
    {
      id: "mariscada",
      name: "Mariscadas",
      description: "Fresco do dia",
      image: mariscadaImage,
    },
  ];

  const freeCount = pendingDish?.sides_free_count ?? 2;

  /**
   * Toggle estilo accordion:
   * - Clica na mesma seção -> fecha
   * - Clica noutra -> abre a nova
   */
  function toggleExtras(section: ExtrasSectionKey) {
    setExtrasOpen((cur) => (cur === section ? "sides" : section));
  }

  return (
      <Layout>
        <div className="container-narrow section-padding">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-display text-gradient-fire mb-2">
              PRATOS DO DIA
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
          </div>

          {loading ? (
              <div className="bg-card rounded-xl border border-border p-6 mb-6 text-muted-foreground">
                Carregando pratos do dia...
              </div>
          ) : !hasAny ? (
              <div className="bg-card rounded-xl border border-border p-6 mb-6">
                <div className="text-foreground font-semibold mb-1">
                  Hoje ainda não está definido.
                </div>
                <div className="text-sm text-muted-foreground">
                  Estamos a atualizar a ementa. Se quiser, chama no WhatsApp e
                  confirmamos já.
                </div>
              </div>
          ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-2xl font-display text-primary mb-4">
                      🥩 CARNE
                    </h2>
                    {grouped.carne.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Sem pratos de carne hoje.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {grouped.carne.map((item) => (
                              <DishButton
                                  key={item.id}
                                  dish={item}
                                  onClick={handlePickDish}
                              />
                          ))}
                        </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-2xl font-display text-primary mb-4">
                      🐟 PEIXE
                    </h2>
                    {grouped.peixe.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Sem pratos de peixe hoje.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {grouped.peixe.map((item) => (
                              <DishButton
                                  key={item.id}
                                  dish={item}
                                  onClick={handlePickDish}
                              />
                          ))}
                        </div>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6 mb-6">
                  <h2 className="text-2xl font-display text-primary mb-4">
                    🔥 GRELHADOS
                  </h2>
                  {grouped.grelhados.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Sem grelhados hoje.
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {grouped.grelhados.map((item) => (
                            <DishButton
                                key={item.id}
                                dish={item}
                                onClick={handlePickDish}
                            />
                        ))}
                      </div>
                  )}
                </div>

                <div className="bg-gradient-dark rounded-xl border border-border p-6 mb-8">
                  <h2 className="text-2xl font-display text-gradient-fire mb-4 text-center">
                    ⭐ ESPECIALIDADES (Por Encomenda)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {especialidades.map((item) => (
                        <div
                            key={item.id}
                            className="bg-card rounded-lg overflow-hidden border border-border"
                        >
                          <div className="aspect-video overflow-hidden">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                          </div>
                          <div className="p-4 text-center">
                            <h3 className="font-semibold text-foreground">
                              {item.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {item.description}
                            </p>
                            <Button
                                variant="fire"
                                size="sm"
                                onClick={() => handleOrderSpecial(item.name)}
                            >
                              Encomendar
                            </Button>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* ==============================
               MINI-MENU: Acompanhamentos / Bebidas / Sobremesas
               ============================== */}
                <div className="bg-card rounded-xl border border-border p-6 mb-6">
                  <h2 className="text-2xl font-display text-primary mb-4">
                    🍽️ EXTRAS
                  </h2>

                  {/* Botões "menu" */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <Button
                        type="button"
                        variant={extrasOpen === "sides" ? "fire" : "secondary"}
                        onClick={() => toggleExtras("sides")}
                    >
                      🥗 Acompanhamentos
                    </Button>

                    <Button
                        type="button"
                        variant={extrasOpen === "drinks" ? "fire" : "secondary"}
                        onClick={() => toggleExtras("drinks")}
                    >
                      🥤 Bebidas
                    </Button>

                    <Button
                        type="button"
                        variant={extrasOpen === "desserts" ? "fire" : "secondary"}
                        onClick={() => toggleExtras("desserts")}
                    >
                      🍰 Sobremesas
                    </Button>
                  </div>

                  {/* Conteúdo expansível */}
                  {extrasOpen === "sides" && (
                      <div className="pt-2">
                        <div className="text-sm text-muted-foreground mb-3">
                          Escolha acompanhamentos avulso.
                        </div>

                        {loadingSides ? (
                            <div className="text-sm text-muted-foreground">
                              Carregando acompanhamentos...
                            </div>
                        ) : dailySides.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Sem acompanhamentos disponíveis hoje.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dailySides.map((s) => (
                                  <div
                                      key={s.id}
                                      className="p-3 bg-background rounded-lg border border-border flex items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{s.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Avulso
                                      </div>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                      <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => addSideAvulso(s, "half")}
                                      >
                                        1/2 • 3€
                                      </Button>
                                      <Button
                                          type="button"
                                          variant="fire"
                                          size="sm"
                                          onClick={() => addSideAvulso(s, "full")}
                                      >
                                        1 dose • 4€
                                      </Button>
                                    </div>
                                  </div>
                              ))}
                            </div>
                        )}
                      </div>
                  )}

                  {extrasOpen === "drinks" && (
                      <div className="pt-2">
                        <div className="text-sm text-muted-foreground">
                          Ainda não temos bebidas cadastradas no sistema.
                          <br />
                          (Quando estiver pronto, aqui vai puxar do banco igual aos pratos.)
                        </div>
                      </div>
                  )}

                  {extrasOpen === "desserts" && (
                      <div className="pt-2">
                        <div className="text-sm text-muted-foreground mb-3">
                          Sobremesas disponíveis:
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {desserts.map((d) => (
                              <div
                                  key={d.id}
                                  className="p-3 bg-background rounded-lg border border-border flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{d.name}</div>
                                  {d.note && (
                                      <div className="text-xs text-muted-foreground">
                                        {d.note}
                                      </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="font-semibold text-primary">
                                    {d.price.toFixed(2)}€
                                  </div>
                                  <Button
                                      type="button"
                                      variant="fire"
                                      size="sm"
                                      onClick={() => addSimpleItem(d)}
                                  >
                                    Adicionar
                                  </Button>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              </>
          )}
        </div>

        <SidesModal
            open={sidesOpen}
            onClose={() => {
              setSidesOpen(false);
              setPendingDish(null);
            }}
            dishName={pendingDish?.name ?? "Prato"}
            dishPortion={pendingPortion}
            sides={dailySides}
            freeCount={freeCount}
            extraHalfPrice={3}
            extraFullPrice={4}
            loading={loadingSides}
            allowNoSides={true}
            onConfirm={finalizeAddWithSides}
        />
      </Layout>
  );
}
