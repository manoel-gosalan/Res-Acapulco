import { useEffect, useMemo, useState } from "react";
import { X, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { addLisbonDaysYYYYMMDD, lisbonYYYYMMDD } from "@/lib/date";
import {
  copyDailyMenu,
  getDailyMenu,
  getMenuItemsAll,
  setDailyMenuForDay,
  setMenuItemSidesRule,
} from "@/services/menu.service";

import { getDailySides, getSidesAll, setDailySidesForDay } from "@/services/sides.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DailyGroupKey, MenuItem } from "@/types/menu";

function clampInt(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type LocalGroupKey = "peixe" | "carne" | "grelhados" | "acompanhamentos";

const GROUPS: Array<{ key: LocalGroupKey; label: string }> = [
  { key: "peixe", label: "Peixe" },
  { key: "carne", label: "Carne" },
  { key: "grelhados", label: "Grelhados" },
  { key: "acompanhamentos", label: "Acompanhamentos" },
];

type SelectedByGroup = Record<LocalGroupKey, Set<string>>;

function emptySelected(): SelectedByGroup {
  return {
    peixe: new Set(),
    carne: new Set(),
    grelhados: new Set(),
    acompanhamentos: new Set(),
  };
}

function snapshot(state: SelectedByGroup) {
  return JSON.stringify({
    peixe: [...state.peixe].sort(),
    carne: [...state.carne].sort(),
    grelhados: [...state.grelhados].sort(),
    acompanhamentos: [...state.acompanhamentos].sort(),
  });
}

function addDaysFromSelectedDay(dayYYYYMMDD: string, delta: number) {
  const base = new Date(`${dayYYYYMMDD}T00:00:00`);
  return addLisbonDaysYYYYMMDD(delta, base);
}

// menu_items + regras de sides
type MenuItemWithSides = MenuItem & {
  sides_enabled?: boolean | null;
  sides_free_count?: number | null;
};

// catálogo side_items
type SideItemRow = {
  id: string;
  name: string;
  active: boolean;
};

export default function DailyMenuOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [day, setDay] = useState(todayYYYYMMDD());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allItems, setAllItems] = useState<MenuItemWithSides[]>([]);
  const [allSides, setAllSides] = useState<SideItemRow[]>([]);

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<LocalGroupKey>("peixe");

  const [selectedByGroup, setSelectedByGroup] = useState<SelectedByGroup>(() => emptySelected());
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function boot() {
      setLoading(true);

      try {
        const [menu, daily, sidesCatalog, dailySides] = await Promise.all([
          getMenuItemsAll(),
          getDailyMenu(day),
          getSidesAll(),
          getDailySides(day),
        ]);

        if (cancelled) return;

        setAllItems(menu as MenuItemWithSides[]);
        setAllSides(sidesCatalog as SideItemRow[]);

        const next = emptySelected();

        // pratos do dia
        for (const row of daily) {
          const g = row.group_key as LocalGroupKey;
          if (next[g]) next[g].add(row.menu_item_id);
        }

        // acompanhamentos do dia (sem portion)
        for (const row of dailySides) {
          next.acompanhamentos.add(row.side_item_id);
        }

        setSelectedByGroup(next);
        setInitialSnapshot(snapshot(next));
      } catch (e) {
        console.error(e);
        toast.error("❌ Erro ao carregar o menu", {
          description: "Verifica ligação/Supabase e tenta novamente.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [open, day]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
  }, [group, open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (group === "acompanhamentos") {
      const base = (allSides ?? []).filter((s) => s.active !== false);
      if (!q) return base;
      return base.filter((s) => (s.name ?? "").toLowerCase().includes(q));
    }

    const base = (allItems ?? []).filter((i) => i.active !== false);
    const byGroup = base.filter((i) => (i.category ?? "").toLowerCase() === group);

    if (!q) return byGroup;

    return byGroup.filter((i) => {
      const name = i.name?.toLowerCase() ?? "";
      const desc = i.description?.toLowerCase() ?? "";
      const cat = (i.category ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [allItems, allSides, search, group]);

  const selectedSet = selectedByGroup[group] ?? new Set<string>();

  function toggle(id: string) {
    setSelectedByGroup((prev) => {
      const copy: SelectedByGroup = {
        peixe: new Set(prev.peixe),
        carne: new Set(prev.carne),
        grelhados: new Set(prev.grelhados),
        acompanhamentos: new Set(prev.acompanhamentos),
      };

      if (copy[group].has(id)) copy[group].delete(id);
      else copy[group].add(id);

      return copy;
    });
  }

  const hasUnsavedChanges = useMemo(() => snapshot(selectedByGroup) !== initialSnapshot, [
    selectedByGroup,
    initialSnapshot,
  ]);

  function handleClose() {
    if (hasUnsavedChanges) {
      const ok = window.confirm("Tens alterações não salvas. Queres mesmo fechar?");
      if (!ok) return;
    }
    onClose();
  }

  async function copiarDeHojeParaDiaSelecionado() {
    const fromDay = lisbonYYYYMMDD();
    const toDay = day;

    if (fromDay === toDay) {
      toast.message("Hoje já está selecionado 🙂", {
        description: "Escolhe outro dia no calendário para copiar a ementa de hoje.",
      });
      return;
    }

    const ok = window.confirm(
      `Copiar ementa de ${fromDay} → ${toDay}?\n\nIsto vai substituir o que já existe em ${toDay}.`
    );
    if (!ok) return;

    setSaving(true);
    try {
      await copyDailyMenu({ fromDay, toDay });

      const [daily, dailySides] = await Promise.all([getDailyMenu(toDay), getDailySides(toDay)]);

      const next = emptySelected();
      for (const row of daily) {
        const g = row.group_key as LocalGroupKey;
        if (next[g]) next[g].add(row.menu_item_id);
      }
      for (const row of dailySides) {
        next.acompanhamentos.add(row.side_item_id);
      }

      setSelectedByGroup(next);
      setInitialSnapshot(snapshot(next));

      toast.success("✅ Ementa copiada!", { description: `Copiamos ${fromDay} → ${toDay}.` });
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível copiar", {
        description: "Verifica permissões/RLS e tenta novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function salvarGrupoAtual() {
    setSaving(true);
    try {
      const ids = Array.from(selectedByGroup[group]);

      if (group === "acompanhamentos") {
        await setDailySidesForDay({ day, sideItemIds: ids });

        toast.success("✅ Acompanhamentos salvos!", {
          description: `Acompanhamentos atualizados para ${day}.`,
        });
      } else {
        await setDailyMenuForDay({ day, groupKey: group as DailyGroupKey, menuItemIds: ids });

        toast.success("✅ Grupo salvo!", {
          description: `Grupo "${group}" atualizado para ${day}.`,
        });
      }

      setInitialSnapshot(snapshot(selectedByGroup));
    } catch (e) {
      console.error(e);
      toast.error("❌ Erro ao salvar", { description: "Tenta novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function salvarTudo() {
    setSaving(true);
    try {
      // ✅ daily_menu só tem peixe/carne/grelhados (sem acompanhamentos!)
      const groups: DailyGroupKey[] = ["peixe", "carne", "grelhados"];

      await Promise.all(
        groups.map((g) =>
          setDailyMenuForDay({
            day,
            groupKey: g,
            menuItemIds: Array.from(selectedByGroup[g]),
          })
        )
      );

      await setDailySidesForDay({
        day,
        sideItemIds: Array.from(selectedByGroup.acompanhamentos),
      });

      toast.success("✅ Tudo salvo!", { description: `Pratos + acompanhamentos atualizados para ${day}.` });

      setInitialSnapshot(snapshot(selectedByGroup));
    } catch (e) {
      console.error(e);
      toast.error("❌ Erro ao salvar tudo", { description: "Tenta novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleSidesRule(item: MenuItemWithSides) {
    try {
      setSaving(true);

      const nextEnabled = !(item.sides_enabled === true);
      const freeCount = clampInt(item.sides_free_count ?? 2, 0, 10);

      await setMenuItemSidesRule({
        menuItemId: item.id,
        sidesEnabled: nextEnabled,
        freeCount,
      });

      setAllItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, sides_enabled: nextEnabled, sides_free_count: freeCount } : x))
      );

      toast.success("✅ Regra atualizada", {
        description: nextEnabled
          ? `Este prato agora tem ${freeCount} acompanhamentos grátis.`
          : "Este prato agora não tem acompanhamentos.",
      });
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível atualizar a regra");
    } finally {
      setSaving(false);
    }
  }

  async function updateFreeCount(item: MenuItemWithSides, raw: string) {
    const n = clampInt(Number(raw || 0), 0, 10);

    try {
      setSaving(true);

      await setMenuItemSidesRule({
        menuItemId: item.id,
        sidesEnabled: item.sides_enabled === true,
        freeCount: n,
      });

      setAllItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, sides_free_count: n } : x)));

      toast.success("✅ Quantidade grátis atualizada", { description: `Agora: ${n} grátis.` });
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível salvar a quantidade grátis");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={handleClose} />

      <div
        className="
          fixed inset-0 lg:inset-auto
          lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
          w-full h-full lg:w-[96vw] lg:max-w-5xl
          bg-card border border-border
          rounded-none lg:rounded-2xl
          shadow-xl overflow-hidden
        "
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">Gestão • Pratos do Dia</div>
            <div className="text-sm text-muted-foreground">
              Escolhe os pratos e salva por grupo
              {hasUnsavedChanges ? (
                <span className="ml-2 inline-flex text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-600 border border-yellow-500/30">
                  Alterações não salvas
                </span>
              ) : (
                <span className="ml-2 inline-flex text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                  Salvo
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full sm:w-[170px]"
              disabled={saving}
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" onClick={copiarDeHojeParaDiaSelecionado} disabled={saving || loading} size="sm">
                Copiar de Hoje
              </Button>

              <Button variant="secondary" type="button" onClick={() => setDay(lisbonYYYYMMDD())} disabled={saving} size="sm">
                Hoje
              </Button>

              <Button variant="secondary" type="button" onClick={() => setDay(addLisbonDaysYYYYMMDD(1))} disabled={saving} size="sm">
                Amanhã
              </Button>

              <Button variant="secondary" type="button" onClick={() => setDay(addDaysFromSelectedDay(day, 1))} disabled={saving} size="sm">
                +1 dia
              </Button>

              <Button variant="secondary" onClick={salvarGrupoAtual} disabled={saving || loading} className="gap-2" type="button" size="sm">
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar grupo"}
              </Button>

              <Button variant="fire" onClick={salvarTudo} disabled={saving || loading} className="gap-2" type="button" size="sm">
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar tudo"}
              </Button>

              <Button variant="ghost" size="icon" onClick={handleClose} type="button">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <div className="bg-muted/20 rounded-xl border border-border p-3">
            <div className="text-sm font-medium mb-2">Grupo</div>

            <div className="space-y-2">
              {GROUPS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGroup(g.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                    group === g.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span>{g.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${group === g.key ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {selectedByGroup[g.key].size}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Buscar</div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="nome ou categoria..." className="pl-9" disabled={loading} />
              </div>
            </div>
          </div>

          {/* Listagem */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">
                Itens <span className="text-muted-foreground">({filtered.length})</span>
              </div>
              {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            </div>

            <div className="max-h-[60vh] sm:max-h-[65vh] lg:max-h-[62vh] overflow-y-auto space-y-2 pr-1">
              {filtered.map((item: any) => {
                const checked = selectedSet.has(item.id);
                const isSide = group === "acompanhamentos";

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={checked ? "true" : "false"}
                    aria-disabled={saving || loading ? "true" : "false"}
                    onClick={() => {
                      if (saving || loading) return;
                      toggle(item.id);
                    }}
                    onKeyDown={(e) => {
                      if (saving || loading) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(item.id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition select-none ${
                      checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                    } ${saving ? "opacity-70 cursor-not-allowed pointer-events-none" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{item.name}</div>

                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                          {isSide ? (
                            <>
                              <span>Acompanhamento</span>
                            </>
                          ) : (
                            <>
                              <span className="capitalize">{item.category}</span>
                              <span>•</span>
                              <span>{item.price != null ? `${Number(item.price).toFixed(2)}€` : "Sob consulta"}</span>
                            </>
                          )}
                        </div>

                        {!isSide && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${
                                item.sides_enabled
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              Acomp: {item.sides_enabled ? "Sim" : "Não"}
                            </span>

                            <Button
                              type="button"
                              size="sm"
                              variant={item.sides_enabled ? "secondary" : "fire"}
                              disabled={saving || loading}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSidesRule(item as MenuItemWithSides);
                              }}
                            >
                              {item.sides_enabled ? "Desativar" : "Ativar"}
                            </Button>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Grátis:</span>
                              <Input
                                className="h-8 w-16"
                                type="number"
                                min={0}
                                max={10}
                                value={item.sides_free_count ?? 2}
                                disabled={!item.sides_enabled || saving || loading}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  const v = clampInt(Number(e.target.value), 0, 10);
                                  setAllItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, sides_free_count: v } : x)));
                                }}
                                onBlur={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateFreeCount(item as MenuItemWithSides, e.target.value);
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {!isSide && item.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</div>
                        )}
                      </div>

                      <div className={`text-xs px-2 py-1 rounded-full shrink-0 ${checked ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {checked ? "Selecionado" : "Selecionar"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Dica: podes salvar por grupo ou clicar em <strong>Salvar tudo</strong>.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={salvarGrupoAtual} disabled={saving || loading} className="gap-2" type="button" size="sm">
              <Save className="w-4 h-4" />
              Salvar {group}
            </Button>

            <Button variant="fire" onClick={salvarTudo} disabled={saving || loading} className="gap-2" type="button" size="sm">
              <Save className="w-4 h-4" />
              Salvar tudo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
