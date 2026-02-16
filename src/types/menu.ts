export type MenuCategory =
  | "pratos-do-dia"
  | "peixe"
  | "carne"
  | "grelhados"
  | "pizzas"
  | "entradas"
  | "sobremesas"
  | "bebidas";

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;

  sides_enabled?: boolean;
  sides_free_count?: number;
};



export type DailyGroupKey = "variados" | "peixe" | "carne" | "grelhados" | "acompanhamentos";

export type DailyMenuRow = {
  id: string;
  day: string; // YYYY-MM-DD
  menu_item_id: string;
  group_key: DailyGroupKey;
  created_at: string;
};
