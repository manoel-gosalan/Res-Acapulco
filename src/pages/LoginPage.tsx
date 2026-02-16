import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import heroBg from "@/assets/hero-grelhados.jpg";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";


type ProfileRole = "admin" | "user";

type LocationState = {
  from?: string;
};

async function getUserRole(userId: string): Promise<ProfileRole> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    // Se não achar profile ou der erro, assume user (mais seguro pro app público)
    console.warn("[login] Não foi possível ler role, assumindo user.", error);
    return "user";
  }

  const role = data?.role;
  return role === "admin" ? "admin" : "user";
}

function isSafePath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

function resolveRedirect(role: ProfileRole, from?: string) {
  // Admin: pode voltar para rotas /admin/*
  if (role === "admin") {
    if (isSafePath(from) && from.startsWith("/admin/")) return from;
    return "/admin/pedidos";
  }

  // User: nunca pode cair em /admin/*
  if (isSafePath(from) && !from.startsWith("/admin/")) return from;
  return "/account/orders";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Preenche email e senha.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("Sessão inválida. Tenta novamente.");

      const role = await getUserRole(user.id);
      const redirectTo = resolveRedirect(role, from);

      toast.success("✅ Login efetuado!");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao entrar";
      toast.error("❌ Não foi possível entrar", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    < div
  className = "min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
  style = {{
    backgroundImage: `linear-gradient(rgba(0,0,0,.65), rgba(0,0,0,.65)), url(${heroBg})`,
  }
}

>
  <form
    onSubmit={handleLogin}
    className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4"
  >
    <h1 className="text-2xl font-bold">Login</h1>

    <div className="space-y-2">
      <label className="text-sm">Email</label>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="email"
        inputMode="email"
        disabled={loading}
      />
    </div>

    <div className="space-y-2">
      <label className="text-sm">Senha</label>
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
        disabled={loading}
      />
    </div>

    <Button className="w-full" type="submit" disabled={loading}>
      {loading ? "Entrando..." : "Entrar"}
    </Button>

    <div className="flex justify-end">
      <Link
          to="/forgot-password"
          className="text-sm text-primary hover:underline"
      >
        Esqueci minha senha
      </Link>
    </div>

  </form>
    </div >
  );
}
