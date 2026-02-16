import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

type Props = {
  children: ReactNode;
};

function FullPageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-muted-foreground">
      Carregando…
    </div>
  );
}

/**
 * Protege rotas de ADMIN.
 * - Se não tiver sessão → manda pro /login e guarda a rota original
 * - Se tiver sessão mas não for admin → manda pro /
 */
export function AdminRoute({ children }: Props) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (authLoading || adminLoading) return <FullPageLoading />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
