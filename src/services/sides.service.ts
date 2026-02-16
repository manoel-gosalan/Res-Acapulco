// src/services/sides.service.ts
import { supabase } from "@/lib/supabase";

/**
 * Porção "lógica" usada no sistema.
 * - half: 1/2 dose
 * - full: 1 dose
 *
 * OBS IMPORTANTE:
 * - Porção NÃO é mais uma coluna em daily_sides.
 * - daily_sides agora só diz "quais acompanhamentos existem no dia".
 * - A porção do EXTRA é uma regra de negócio do prato (dishPortion).
 */
export type Portion = "half" | "full";

/**
 * side_items = catálogo global
 */
export type SideCatalogItem = {
  id: string;
  name: string;
  active: boolean;
  // se você tiver preço no side_items, pode manter aqui (ex half_price)
  // half_price?: number;
};

/**
 * daily_sides = disponibilidade diária (sem porção)
 */
export type DailySideRow = {
  day: string;
  side_item_id: string;
  created_at?: string;
};

/**
 * Join: daily_sides + side_items
 */
export type DailySideWithItem = {
  day: string;
  side_item_id: string;
  created_at?: string;
  side_items: {
    id: string;
    name: string;
    active: boolean;
    // half_price?: number;
  } | null;
};

/**
 * ✅ Catálogo global: todos os acompanhamentos cadastrados
 */
export async function getSidesAll(): Promise<SideCatalogItem[]> {
  const { data, error } = await supabase
    .from("side_items")
    .select("id,name,active")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SideCatalogItem[];
}

/**
 * ✅ Linhas do dia (sem join) — útil pra checar se já existe config no dia.
 */
export async function getDailySides(day: string): Promise<DailySideRow[]> {
  const { data, error } = await supabase
    .from("daily_sides")
    .select("day,side_item_id,created_at")
    .eq("day", day);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    day: String(r.day),
    side_item_id: String(r.side_item_id),
    created_at: r.created_at ? String(r.created_at) : undefined,
  }));
}

/**
 * ✅ Daily sides com join no catálogo (side_items)
 * Esse é o formato rico que a UI/admin usa.
 */
export async function getDailySidesWithItems(day: string): Promise<DailySideWithItem[]> {
  const { data, error } = await supabase
    .from("daily_sides")
    .select("day,side_item_id,created_at,side_items(id,name,active)")
    .eq("day", day);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    day: String(r.day),
    side_item_id: String(r.side_item_id),
    created_at: r.created_at ? String(r.created_at) : undefined,
    side_items: r.side_items
      ? {
          id: String(r.side_items.id),
          name: String(r.side_items.name),
          active: Boolean(r.side_items.active),
        }
      : null,
  }));
}

/**
 * ✅ Função ideal pro cliente:
 * Retorna só os acompanhamentos ativos do dia (flatten).
 *
 * Nota: sem portion no banco.
 * - portion do extra é determinado pelo prato (dishPortion) no modal/carrinho.
 */
export async function listActiveSides(day: string): Promise<Array<{ id: string; name: string; active: boolean }>> {
  const rows = await getDailySidesWithItems(day);

  return rows
    .filter((r) => r.side_items && r.side_items.active !== false)
    .map((r) => ({
      id: r.side_items!.id,
      name: r.side_items!.name,
      active: true,
    }));
}

/**
 * ✅ Salva acompanhamentos do dia (apenas IDs).
 * Estratégia simples, estável e fácil de debugar:
 * - delete all for day
 * - insert new set
 */
export async function setDailySidesForDay(params: { day: string; sideItemIds: string[] }) {
  const { day, sideItemIds } = params;

  // 1) apaga tudo do dia
  const del = await supabase.from("daily_sides").delete().eq("day", day);
  if (del.error) throw del.error;

  // 2) se não tem nenhum, acabou
  if (!sideItemIds || sideItemIds.length === 0) return;

  // 3) insere
  const rows = sideItemIds.map((id) => ({
    day,
    side_item_id: id,
  }));

  const ins = await supabase.from("daily_sides").insert(rows);
  if (ins.error) throw ins.error;
}

/**
 * ✅ Template simples (só IDs)
 */
export async function getTemplateSideIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("side_templates")
    .select("side_item_id")
    .eq("enabled", true);

  if (error) throw error;
  return (data ?? []).map((r: any) => String(r.side_item_id));
}

export async function setTemplateSideIds(sideItemIds: string[]) {
  // sobrescreve template inteiro
  const del = await supabase
    .from("side_templates")
    .delete()
    .neq("side_item_id", "00000000-0000-0000-0000-000000000000");

  if (del.error) throw del.error;

  if (!sideItemIds || sideItemIds.length === 0) return;

  const rows = sideItemIds.map((id) => ({ side_item_id: id, enabled: true }));
  const ins = await supabase.from("side_templates").insert(rows);
  if (ins.error) throw ins.error;
}

/**
 * ✅ Se o dia não tem daily_sides, copia do template.
 */
export async function ensureDailySidesFromTemplate(day: string) {
  const current = await getDailySides(day);
  if (current.length > 0) return listActiveSides(day);

  const templateIds = await getTemplateSideIds();

  if (templateIds.length > 0) {
    await setDailySidesForDay({ day, sideItemIds: templateIds });
  }

  return listActiveSides(day);
}
