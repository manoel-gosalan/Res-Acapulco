import { supabase } from "@/lib/supabase";
import type { DailyGroupKey, MenuItem } from "@/types/menu";

export async function getMenuItemsAll() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function getMenuItemsActive() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function setDailyMenuForDay(params: {
  day: string; // YYYY-MM-DD
  groupKey: DailyGroupKey;
  menuItemIds: string[]; // lista final pra esse grupo
}) {
  const { day, groupKey, menuItemIds } = params;

  // 1) apaga o que existe desse grupo nesse dia
  const del = await supabase
    .from("daily_menu")
    .delete()
    .eq("day", day)
    .eq("group_key", groupKey);

  if (del.error) throw del.error;

  // 2) insere o novo conjunto
  if (menuItemIds.length === 0) return;

  const rows = menuItemIds.map((id) => ({
    day,
    group_key: groupKey,
    menu_item_id: id,
  }));

  const ins = await supabase.from("daily_menu").insert(rows);
  if (ins.error) throw ins.error;
}

export async function getDailyMenu(day: string) {
  // traz daily + item junto
  const { data, error } = await supabase
    .from("daily_menu")
    .select(`
      id,
      day,
      group_key,
      menu_item_id,
      menu_items:menu_item_id (
      id,
      name,
      description,
      category,
      price,
      image_url,
      sides_enabled,
      sides_free_count,
      portion_type
      )
    `)
    .eq("day", day);

  if (error) throw error;

  return (data ?? []) as Array<{
    id: string;
    day: string;
    group_key: string;
    menu_item_id: string;
    menu_items: {
      id: string;
      name: string;
      description: string | null;
      category: string;
      price: number | null;
      image_url: string | null;

      sides_enabled?: boolean;
      sides_free_count?: number;
      portion_type?: "half" | "full";
    }[];
  }>;
}

export async function copyDailyMenu(params: {
  fromDay: string; // YYYY-MM-DD
  toDay: string;   // YYYY-MM-DD
}) {
  const {fromDay, toDay} = params;

  const rows = await getDailyMenu(fromDay);

  const byGroup: Record<DailyGroupKey, string[]> = {
    variados: [],
    peixe: [],
    carne: [],
    grelhados: [],
    acompanhamentos: [],
  };

  for (const r of rows) {
    const g = r.group_key as DailyGroupKey;
    if (!byGroup[g]) continue;
    byGroup[g].push(r.menu_item_id);
  }

  // salva todos os grupos no dia destino
  const groups: DailyGroupKey[] = ["variados", "peixe", "carne", "grelhados", "acompanhamentos"];

  await Promise.all(
      groups.map((g) =>
          setDailyMenuForDay({
            day: toDay,
            groupKey: g,
            menuItemIds: byGroup[g] ?? [],
          })
      )
  );
}

export async function setMenuItemSidesRule(params: {
  menuItemId: string;
  sidesEnabled: boolean;
  freeCount: number;
}) {
  const { menuItemId, sidesEnabled, freeCount } = params;

  const { error } = await supabase
      .from("menu_items")
      .update({
        sides_enabled: sidesEnabled,
        sides_free_count: freeCount,
      })
      .eq("id", menuItemId);

  if (error) throw error;
}
