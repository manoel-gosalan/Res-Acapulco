// src/types/pedido.ts

export type OrderItem = {
  id?: string;
  name: string;
  quantity: number;
  price?: number | null;
};

export type PedidoStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "rejected"
  | "adjusted"
  | "done";

export type DeliveryType = "delivery" | "takeaway";

/**
 * Tipo alinhado com o schema NOVO da tabela public.pedidos
 * (customer_name, address_line, requested_time, delivery_type, items, observations...)
 */
export type Pedido = {
  id: string;

  user_id: string | null;

  status: PedidoStatus;

  delivery_type: DeliveryType;

  customer_name: string | null;
  address_line: string | null;
  requested_time: string | null;

  observations: string | null; // observação do cliente (schema novo)
  observacoes_admin: string | null; // se tu ainda usa no admin, mantém. Se não existir no schema, remove.

  total: number;

  items: OrderItem[]; // coluna jsonb NOT NULL

  created_at: string;
  updated_at?: string | null;

  accepted_at?: string | null;
  rejected_at?: string | null;

  // se ainda existir no schema e tu usa:
  hora_confirmada?: string | null; // (opcional) se quiser padronizar depois, migra pra confirmed_time
};
