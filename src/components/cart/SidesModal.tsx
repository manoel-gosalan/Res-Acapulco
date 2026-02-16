import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Portion = porção do PRATO (e portanto porção do EXTRA).
 * O acompanhamento em si (SideItem) não tem porção.
 */
export type Portion = "half" | "full";

/**
 * SideItem (catálogo do dia):
 * - sem portion
 * - active permite desativar sem deletar
 */
export type SideItem = {
  id: string;
  name: string;
  active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;

  dishName: string;

  /** Acompanhamentos do dia (do service) */
  sides: SideItem[];

  /** Quantos grátis esse prato permite */
  freeCount: number;

  /** preços globais (ideal vir do app_settings) */
  extraHalfPrice: number; // ex: 3
  extraFullPrice: number; // ex: 4

  /** porção do prato trava os extras */
  dishPortion: Portion;

  /** mostra botão "Sem guarnição" */
  allowNoSides?: boolean;

  loading?: boolean;

  onConfirm: (result: {
    freeSideIds: string[];
    extras: Array<{ sideId: string; size: Portion; quantity: number }>;
  }) => void;
};

/** Helpers — centraliza regra e evita duplicação */
function getUnitPrice(dishPortion: Portion, half: number, full: number) {
  return dishPortion === "half" ? half : full;
}
function getPortionLabel(dishPortion: Portion) {
  return dishPortion === "half" ? "1/2 dose" : "1 dose";
}

/**
 * ✅ SidesModal (MVP profissional)
 * - Escolhe até freeCount como grátis
 * - Extras sempre com a porção do prato (dishPortion)
 * - Não “vaza” estado entre pratos (reset e sanitização)
 */
export function SidesModal({
  open,
  onClose,
  dishName,
  sides,
  freeCount,
  extraHalfPrice,
  extraFullPrice,
  dishPortion,
  allowNoSides = false,
  loading = false,
  onConfirm,
}: Props) {
  /**
   * freeSelected: ids de sides escolhidos como grátis
   * extrasQtyById: sideId -> quantidade de extras
   */
  const [freeSelected, setFreeSelected] = useState<string[]>([]);
  const [extrasQtyById, setExtrasQtyById] = useState<Record<string, number>>({});

  /** Preço unitário do extra depende da porção do PRATO */
  const unitPrice = useMemo(
    () => getUnitPrice(dishPortion, extraHalfPrice, extraFullPrice),
    [dishPortion, extraHalfPrice, extraFullPrice]
  );

  const portionLabel = useMemo(() => getPortionLabel(dishPortion), [dishPortion]);

  /**
   * ✅ Fonte única da verdade:
   * mostra todos os acompanhamentos ATIVOS do dia.
   */
  const visibleSides = useMemo(() => {
    return (sides ?? [])
      .filter((s) => s && s.active !== false)
      .slice()
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-PT"));
  }, [sides]);

  /**
   * ✅ RESET hard quando abre/fecha
   * Isso evita exatamente o bug que você relatou: dados antigos “ficam lá”.
   *
   * Observação: uso open e dishName para garantir reset ao trocar prato.
   */
  useEffect(() => {
    if (!open) {
      setFreeSelected([]);
      setExtrasQtyById({});
      return;
    }

    // Quando abre, começa limpo (prato novo)
    setFreeSelected([]);
    setExtrasQtyById({});
  }, [open, dishName]);

  /**
   * ✅ Sanitiza estado se a lista do dia mudar (ou se side foi desativado)
   */
  useEffect(() => {
    if (!open) return;

    const allowed = new Set(visibleSides.map((s) => s.id));

    setFreeSelected((prev) => prev.filter((id) => allowed.has(id)));

    setExtrasQtyById((prev) => {
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        if (allowed.has(id) && qty > 0) next[id] = qty;
      }
      return next;
    });
  }, [visibleSides, open]);

  const freeRemaining = Math.max(0, freeCount - freeSelected.length);

  const extrasTotal = useMemo(() => {
    const qtyTotal = Object.values(extrasQtyById).reduce((acc, q) => acc + (q > 0 ? q : 0), 0);
    return qtyTotal * unitPrice;
  }, [extrasQtyById, unitPrice]);

  function toggleFree(id: string) {
    setFreeSelected((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);

      // trava no limite de grátis
      if (prev.length >= freeCount) return prev;

      return [...prev, id];
    });
  }

  function incExtra(id: string) {
    setExtrasQtyById((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function decExtra(id: string) {
    setExtrasQtyById((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }

  function handleConfirm() {
    const extras = Object.entries(extrasQtyById)
      .filter(([, qty]) => qty > 0)
      .map(([sideId, quantity]) => ({
        sideId,
        size: dishPortion, // ✅ travado pelo prato
        quantity,
      }));

    onConfirm({ freeSideIds: freeSelected, extras });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* panel */}
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-4">
        <div className="w-full md:max-w-2xl bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-start justify-between border-b border-border p-4">
            <div>
              <div className="text-sm text-muted-foreground">Acompanhamentos</div>
              <h3 className="text-lg font-semibold text-foreground">{dishName}</h3>
              <div className="text-xs text-muted-foreground mt-1">
                Extras: <span className="font-semibold text-foreground">{portionLabel}</span> •{" "}
                {unitPrice.toFixed(2)}€
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} type="button">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* body */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando acompanhamentos...</div>
            ) : visibleSides.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem acompanhamentos disponíveis hoje.</div>
            ) : (
              <>
                {/* sem guarnição */}
                {allowNoSides && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      onConfirm({ freeSideIds: [], extras: [] });
                      onClose();
                    }}
                  >
                    Sem guarnição
                  </Button>
                )}

                {/* grátis */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-foreground">Grátis</div>
                    <div className="text-xs text-muted-foreground">
                      {freeSelected.length}/{freeCount} escolhidos{" "}
                      {freeRemaining > 0 ? `• faltam ${freeRemaining}` : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {visibleSides.map((s) => {
                      const checked = freeSelected.includes(s.id);
                      const disabled = !checked && freeSelected.length >= freeCount;

                      return (
                        <div
                          key={`free-${s.id}`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={checked}
                          aria-disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            toggleFree(s.id);
                          }}
                          onKeyDown={(e) => {
                            if (disabled) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleFree(s.id);
                            }
                          }}
                          className={[
                            "p-3 rounded-lg border text-left transition-colors select-none",
                            checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                          ].join(" ")}
                        >
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {checked ? "Selecionado" : disabled ? "Limite atingido" : "Tocar para selecionar"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* extras */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-foreground">Extras</div>
                    <div className="text-xs text-muted-foreground">
                      {portionLabel} • {unitPrice.toFixed(2)}€ cada • Total: {extrasTotal.toFixed(2)}€
                    </div>
                  </div>

                  <div className="space-y-2">
                    {visibleSides.map((s) => {
                      const qty = extrasQtyById[s.id] ?? 0;

                      return (
                        <div
                          key={`extra-${s.id}`}
                          className="p-3 rounded-lg border border-border flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {portionLabel} • {unitPrice.toFixed(2)}€
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => decExtra(s.id)}
                              disabled={qty <= 0}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>

                            <span className="w-8 text-center font-semibold">{qty}</span>

                            <Button
                              type="button"
                              variant="fire"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => incExtra(s.id)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* footer */}
          <div className="border-t border-border p-4 flex flex-col md:flex-row gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
              Cancelar
            </Button>

            <Button
              type="button"
              variant="fire"
              className="w-full"
              onClick={handleConfirm}
              disabled={loading || visibleSides.length === 0}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
