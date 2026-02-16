import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

/** Normaliza telefone PT para guardar como digits. Se vier 9 dígitos, assume 351. */
function normalizePhonePT(phone: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  if (digits.length === 9) return `351${digits}`;
  return digits;
}

type Metadata = {
  full_name?: string;
  phone?: string;
  address_line?: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ Sync pós-login:
   * - Se profiles.full_name/phone estiverem vazios, usa user_metadata
   * - Se não existir morada default, cria uma e seta default_address_id
   *
   * Importante: isso roda em background e NÃO bloqueia a UI do /account.
   */
  const syncFromMetadata = useCallback(async (u: User) => {
    try {
      const md = (u.user_metadata ?? {}) as Metadata;
      const mdName = (md.full_name ?? "").trim();
      const mdPhone = normalizePhonePT(md.phone ?? "");
      const mdAddr = (md.address_line ?? "").trim();

      // 1) Lê profile atual
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, phone, default_address_id")
        .eq("id", u.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const dbName = (profile?.full_name ?? "").trim();
      const dbPhone = (profile?.phone ?? "").trim();
      const dbDefaultAddrId = profile?.default_address_id ?? null;

      // 2) Upsert profile se estiver incompleto
      const shouldWriteProfile = !profile || (!dbName && !!mdName) || (!dbPhone && !!mdPhone);

      if (shouldWriteProfile) {
        const { error: upErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: u.id,
              full_name: (dbName || mdName || "").trim() || null,
              phone: (dbPhone || mdPhone || "").trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (upErr) throw upErr;
      }

      // 3) Se já tem default_address_id, não mexe
      if (dbDefaultAddrId) return;

      // 4) Se não tem default_address_id, tenta achar uma morada default
      const { data: defAddr, error: dErr } = await supabase
        .from("customer_addresses")
        .select("id, address_line")
        .eq("user_id", u.id)
        .eq("is_default", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dErr) throw dErr;

      // se já existe uma default, só sincroniza o default_address_id no profile
      if (defAddr?.id) {
        const { error: linkErr } = await supabase
          .from("profiles")
          .update({ default_address_id: defAddr.id, updated_at: new Date().toISOString() })
          .eq("id", u.id);

        if (linkErr) throw linkErr;
        return;
      }

      // 5) Se não tem nenhuma default e veio address_line do metadata, cria + seta default
      if (mdAddr.length >= 8) {
        // cria morada como default
        const { data: created, error: cErr } = await supabase
          .from("customer_addresses")
          .insert({
            user_id: u.id,
            label: "Casa",
            address_line: mdAddr,
            notes: null,
            is_default: true,
          })
          .select("id")
          .single();

        if (cErr) throw cErr;

        // garante que só essa ficou default (opcional, mas seguro)
        await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", u.id)
          .neq("id", created.id);

        // sincroniza no profile
        const { error: linkErr } = await supabase
          .from("profiles")
          .update({ default_address_id: created.id, updated_at: new Date().toISOString() })
          .eq("id", u.id);

        if (linkErr) throw linkErr;
      }
    } catch (e) {
      console.warn("[AuthProvider] syncFromMetadata failed:", e);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const u = data.session?.user ?? null;
        if (!alive) return;

        setUser(u);
      } catch (e) {
        console.error("[AuthProvider] getSession error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);

      // ✅ roda em background, sem travar UI
      if (u) void syncFromMetadata(u);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [syncFromMetadata]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
