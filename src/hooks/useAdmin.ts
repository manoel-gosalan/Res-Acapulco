import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type UseAdminResult = {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useAdmin(): UseAdminResult {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Se não tem user, não é admin.
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        // Se o Supabase bloquear por RLS, ou der erro de query:
        setIsAdmin(false);
        setError(error.message);
        return;
      }

      setIsAdmin(data?.role === "admin");
    } catch (e) {
      setIsAdmin(false);
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // protege contra setState depois de unmount
      if (!alive) return;
      await refresh();
    })();

    return () => {
      alive = false;
    };
  }, [refresh]);

  return { isAdmin, loading, error, refresh };
}
