import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountIndex() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isOrders = location.pathname.includes("/account/orders");

  return (
    <Layout>
      <div className="container-narrow section-padding">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display text-gradient-fire">A tua conta</h1>
            <p className="text-sm text-muted-foreground">
              Morada, dados e histórico de pedidos
            </p>
          </div>

          <Button variant="secondary" onClick={signOut}>
            Sair
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button asChild variant={!isOrders ? "fire" : "secondary"} size="sm">
            <Link to="/account">Perfil</Link>
          </Button>

          <Button asChild variant={isOrders ? "fire" : "secondary"} size="sm">
            <Link to="/account/orders">Pedidos</Link>
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <Outlet />
        </div>
      </div>
    </Layout>
  );
}
