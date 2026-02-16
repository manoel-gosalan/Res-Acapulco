export interface CartItem {
  id: string;
  name: string;
  price?: number;
  quantity: number;
  kind?: "dish" | "side";
  parentID: string;
  isFree?: boolean
}

export interface OrderDetails {
  items: CartItem[];
  name: string;
  address: string;
  time: string;
  observations: string;
}

export const WHATSAPP_NUMBER = "351920411402";
export const PHONE_NUMBER = "232421996";

export function generateWhatsAppMessage(order: OrderDetails): string {
  const itemsList = order.items
    .map((item) => `• ${item.quantity}x ${item.name}${item.price ? ` (${item.price.toFixed(2)}€)` : ''}`)
    .join('\n');

  const message = ` *Novo Pedido - ACAPULCO Take Away*

 *Itens:*
${itemsList}

 *Nome:* ${order.name || 'Não indicado'}
 *Morada:* ${order.address || 'Não indicada'}
 *Hora pretendida:* ${order.time || 'Não indicada'}
${order.observations ? ` *Observações:* ${order.observations}` : ''}

Obrigado pela preferência! `;

  return encodeURIComponent(message);
}

export function openWhatsApp(message?: string): void {
  const baseUrl = `https://wa.me/${WHATSAPP_NUMBER}`;
  const url = message ? `${baseUrl}?text=${message}` : baseUrl;
  window.open(url, '_blank');
}

export function openWhatsAppOrder(order: OrderDetails): void {
  const message = generateWhatsAppMessage(order);
  openWhatsApp(message);
}

export function openWhatsAppSimple(text: string): void {
  const message = encodeURIComponent(text);
  openWhatsApp(message);
}

export function callPhone(): void {
  window.location.href = `tel:${PHONE_NUMBER}`;
}
