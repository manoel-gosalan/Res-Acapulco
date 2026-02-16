import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listMyOrders, type PedidoRow } from "@/services/orders.service";

/**
 * Histórico de pedidos do cliente autenticado.
 * - Busca apenas pedidos do próprio usuário (RLS)
 * - Exibe status, total e data
 */
export default function OrderHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PedidoRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function loadOrders() {
      try {
        setLoading(true);

        const data = await listMyOrders();
        if (!alive) return;

        setOrders(data);
      } catch (error) {
        console.error("[OrderHistory] erro ao carregar pedidos:", error);
        toast.error("Não foi possível carregar teu histórico.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="text-muted-foreground">Carregando pedidos...</div>;

  if (orders.length === 0) return <div className="text-muted-foreground">Ainda não tens pedidos.</div>;

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Pedido #{order.id.slice(0, 8)}</div>

            <div className="text-sm text-muted-foreground">
              {order.created_at ? new Date(order.created_at).toLocaleString("pt-PT") : "—"}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm">
              Status: <span className="font-medium capitalize">{order.status}</span>
            </div>

            <div className="font-bold text-primary">{order.total.toFixed(2)}€</div>
          </div>
        </div>
      ))}
    </div>
  );
}
