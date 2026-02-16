import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { openWhatsAppSimple, callPhone } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";

import terraMarImage from "@/assets/terra-mar.jpg";
import grelhadoMistoImage from "@/assets/grelhado-misto.jpg";
import mariscadaImage from "@/assets/mariscada.jpg";

/**
 * Row do Supabase (tabela menu_items) que precisamos nesta tela.
 * - `collection` indica que isso pertence às especialidades.
 * - `active` controla se aparece ou não.
 */
type MenuItemRow = {
  id: string; // UUID
  name: string;
  active: boolean | null;
  collection: string | null;
};

/**
 * Estrutura final para renderizar a UI.
 * Observação: `metaKey` é a chave "estável" para buscar metadados.
 */
type EspecialidadeUI = {
  id: string;
  name: string;
  metaKey: string;

  tagline: string;
  description: string;
  details: string[];

  serves: string;
  advance: string;
  image: string;
};

/**
 * =========================
 * Helpers / Regras de Negócio
 * =========================
 *
 * Regras:
 * 1) A vitrine tem ordem manual por popularidade (ranking).
 * 2) Dentro de "Mariscada", ordenar por preço crescente:
 *    65€ -> 75€ -> 120€
 *
 * Boas práticas:
 * - Não depender do `name` literal do DB para identificar a especialidade,
 *   porque o name inclui variações como "(65€)", "(5/6 pax)", "(1kg)".
 * - Derivar uma `metaKey` estável removendo parênteses.
 * - Ter fallback seguro caso falte metadata.
 */

/**
 * Normaliza o nome vindo do DB para uma chave estável (metaKey).
 *
 * Ex:
 *  - "Mariscada (65€)" -> "mariscada"
 *  - "Terra Mar (7/8 pax)" -> "terra mar"
 *  - "Sapateira recheada (1kg)" -> "sapateira recheada"
 */
function toMetaKeyFromName(name: string) {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ") // remove "(...)" e espaços em volta
    .replace(/\s+/g, " ")            // normaliza espaços duplicados
    .trim()
    .toLowerCase();
}

/**
 * Extrai o preço em euros do name.
 *
 * Ex:
 *  - "Mariscada (65€)" -> 65
 *  - "Mariscada (120€)" -> 120
 *
 * Retorna `null` se não encontrar.
 */
function extractEuroPrice(name: string): number | null {
  const match = name.match(/(\d+)\s*€/);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Ranking da vitrine (popularidade/venda).
 * Menor número = aparece primeiro.
 *
 * Importante: as chaves são metaKey (resultado de toMetaKeyFromName).
 */
const SPECIALTIES_ORDER: Record<string, number> = {
  "terra mar": 1,
  "grelhada mista especial": 2,
  "sapateira recheada": 3,
  "mariscada": 4,
  "combinado do mar": 5,
};

/**
 * Regra secundária de ordenação por tipo:
 * - Mariscada: ordena por preço (crescente)
 * - Outros: sem regra secundária
 */
function getSecondarySortValue(item: { metaKey: string; name: string }) {
  if (item.metaKey === "mariscada") {
    // Sem preço vai pro final do grupo
    return extractEuroPrice(item.name) ?? Number.POSITIVE_INFINITY;
  }
  return null;
}

/**
 * Comparador final de especialidades:
 * 1) Ranking de vitrine (popularidade)
 * 2) Para Mariscada: preço (crescente)
 * 3) Fallback alfabético
 */
function compareSpecialties(
  a: { metaKey: string; name: string },
  b: { metaKey: string; name: string }
) {
  const aRank = SPECIALTIES_ORDER[a.metaKey] ?? 999;
  const bRank = SPECIALTIES_ORDER[b.metaKey] ?? 999;

  if (aRank !== bRank) return aRank - bRank;

  // Se for o mesmo "tipo", tenta regra secundária
  const aSecondary = getSecondarySortValue(a);
  const bSecondary = getSecondarySortValue(b);

  if (
    typeof aSecondary === "number" &&
    typeof bSecondary === "number" &&
    aSecondary !== bSecondary
  ) {
    return aSecondary - bSecondary;
  }

  // Fallback: alfabético
  return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
}

/**
 * Metadados "fixos" para cada especialidade (conteúdo editorial).
 *
 * BOA PRÁTICA:
 * - Use chaves estáveis (metaKey) aqui (ex: "mariscada", "terra mar"...),
 *   e não o name exato do banco.
 */
const SPECIALTIES_META: Record<
  string,
  Omit<EspecialidadeUI, "id" | "name" | "metaKey">
> = {
  "terra mar": {
    tagline: "O melhor do mar e da terra",
    description:
      "Uma combinação perfeita de marisco fresco e carnes grelhadas premium.",
    details: [
      "Marisco fresco",
      "Carnes selecionadas",
      "Legumes Salteados",
      
    ],
    serves: "2-8 pessoas",
    advance: "Encomendar com antecedência",
    image: terraMarImage,
  },

  "grelhada mista especial": {
    tagline: "Para 2 ou mais pessoas",
    description:
      "Seleção generosa das nossas melhores carnes grelhadas na brasa.",
    details: [
      "Bife",
      "Costeleta",
      "Frango",
      "Chouriço",
      "Batatas",
      "Legumes salteados",
    ],
    serves: "2-6 pessoas",
    advance: "Encomendar com antecedência",
    image: grelhadoMistoImage,
  },

  "sapateira recheada": {
    tagline: "Clássico da casa",
    description:
      "Sapateira recheada preparada com o nosso tempero, perfeita para entrada ou partilha.",
    details: ["Sapateira", "Recheio da casa", "Tostas/pão (sob pedido)"],
    serves: "2+ pessoas",
    advance: "Confirmar disponibilidade",
    image: mariscadaImage,
  },

  "mariscada": {
    tagline: "Fresco do dia",
    description:
      "Marisco fresco preparado à sua escolha, conforme disponibilidade diária.",
    details: ["Camarão", "Amêijoas", "Mexilhão", "Sapateira", "Lagosta (sob consulta)"],
    serves: "2+ pessoas",
    advance: "Confirmar disponibilidade",
    image: mariscadaImage,
  },

  "combinado do mar": {
    tagline: "Seleção do mar",
    description:
      "Um combinado especial com o melhor do mar, pensado para partilhar.",
    details: ["Marisco do dia", "Peixe selecionado", "Acompanhamentos da casa"],
    serves: "2+ pessoas",
    advance: "Confirmar disponibilidade",
    image: mariscadaImage,
  },
};

/**
 * Fallback seguro: se não existir meta para uma especialidade,
 * a UI ainda renderiza (não some do site).
 */
function getMetaWithFallback(metaKey: string, originalName: string) {
  const meta = SPECIALTIES_META[metaKey];

  if (!meta) {
    console.warn("[Especialidades] Sem meta para item:", {
      originalName,
      metaKey,
    });
  }

  return (
    meta ?? {
      tagline: "Especialidade da casa",
      description: "Descrição em breve. Fale connosco para mais detalhes.",
      details: [],
      serves: "—",
      advance: "—",
      image: terraMarImage,
    }
  );
}

export default function Especialidades() {
  const [rows, setRows] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadEspecialidades() {
      setLoading(true);

      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, active, collection")
        .eq("collection", "especialidades")
        .or("active.is.null,active.eq.true")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar especialidades:", error);
        if (alive) setRows([]);
        if (alive) setLoading(false);
        return;
      }

      if (alive) setRows((data ?? []) as MenuItemRow[]);
      if (alive) setLoading(false);
    }

    loadEspecialidades();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Deriva o array final de UI + aplica a ordenação de vitrine.
   */
  const especialidades: EspecialidadeUI[] = useMemo(() => {
    const mapped = rows.map((row) => {
      const metaKey = toMetaKeyFromName(row.name);
      const meta = getMetaWithFallback(metaKey, row.name);

      return {
        id: row.id,
        name: row.name, // mantém variações como (65€), (5/6 pax), etc.
        metaKey,
        ...meta,
      };
    });

    // ✅ Ordenação final: vitrine + mariscadas por preço + fallback alfabético
    mapped.sort(compareSpecialties);

    return mapped;
  }, [rows]);

  const handleOrder = (name: string) => {
    openWhatsAppSimple(
      `Olá! Gostaria de encomendar a especialidade: ${name}. Qual a disponibilidade?`
    );
  };

  return (
    <Layout>
      <div className="container-narrow section-padding">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-display text-gradient-fire mb-4">
            ESPECIALIDADES
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pratos exclusivos preparados com ingredientes premium e todo o cuidado
            que merecem.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">
            A carregar especialidades...
          </div>
        ) : (
          <div className="space-y-12">
            {especialidades.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-glow">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <h2 className="text-3xl md:text-4xl font-display text-foreground mb-2">
                    {item.name}
                  </h2>

                  <p className="text-primary font-medium mb-4">{item.tagline}</p>

                  <p className="text-muted-foreground mb-6">{item.description}</p>

                  {item.details.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Inclui:
                      </h4>
                      <ul className="grid grid-cols-2 gap-1">
                        {item.details.map((detail, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      {item.serves}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      {item.advance}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="fire"
                      size="lg"
                      onClick={() => handleOrder(item.name)}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Encomendar
                    </Button>

                    <Button variant="call" size="lg" onClick={callPhone}>
                      <Phone className="w-5 h-5" />
                      Ligar
                    </Button>
                  </div>

                  {/* Debug opcional (remove em produção) */}
                  {/* <p className="text-xs text-muted-foreground mt-3">
                    metaKey: {item.metaKey}
                  </p> */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
