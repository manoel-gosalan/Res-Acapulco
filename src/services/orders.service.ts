import { supabase } from "@/lib/supabase";

export type DeliveryType = "delivery" | "takeaway";

export type OrderItem = {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
};

export type CreateOrderInput = {
  delivery_type: DeliveryType;
  customer_name: string;
  customer_phone: string; // ✅ obrigatório no UI (guest e logado)
  address_line?: string | null;
  requested_time?: string | null;
  observations?: string | null;
  items: OrderItem[];
  total: number;
};

export type PedidoRow = {
  id: string;
  user_id: string | null;
  status: string | null;

  delivery_type: string;
  customer_name: string | null;
  address_line: string | null;
  requested_time: string | null;
  observations: string | null;
  total: number;
  items: OrderItem[];
  created_at?: string;

  // legado (mantém compat)
  cliente_nome?: string | null;
  cliente_endereco?: string | null;
  cliente_telefone?: string | null;
  tipo_entrega?: string | null;
  hora_solicitada?: string | null;
  observacoes_cliente?: string | null;
};

function normalizeRequestedTime(value: string | null | undefined) {
  const t = (value ?? "").trim();
  return t.length ? t : null;
}

export async function createMyOrder(payload: CreateOrderInput): Promise<PedidoRow> {
  const { data, error } = await supabase.rpc("create_public_order", {
  p_delivery_type: payload.delivery_type,
  p_customer_name: payload.customer_name,
  p_customer_phone: payload.customer_phone,
  p_items: payload.items,
  p_total: payload.total,
  p_address_line: payload.address_line ?? null,
  p_requested_time: normalizeRequestedTime(payload.requested_time),
  p_observations: payload.observations ?? null,
});


  if (error) throw error;
  return data as PedidoRow;
}

export async function listMyOrders(): Promise<PedidoRow[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PedidoRow[];
}
