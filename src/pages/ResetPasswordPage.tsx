import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import heroBg from "@/assets/hero-grelhados.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isStrongEnough(pw: string) {
    // MVP: pelo menos 8 chars (podes melhorar depois)
    return pw.length >= 8;
}

export default function ResetPasswordPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [hasSession, setHasSession] = useState(false);

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);

    // 1) Garantir sessão válida quando a pessoa chega pelo link do email
    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);

            try {
                // Fluxo novo do Supabase costuma vir com ?code=...
                const url = new URL(window.location.href);
                const code = url.searchParams.get("code");

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;

                    // Limpa o code da URL por segurança/estética
                    url.searchParams.delete("code");
                    window.history.replaceState({}, document.title, url.toString());
                }

                const { data } = await supabase.auth.getSession();
                if (!alive) return;

                const ok = !!data.session;
                setHasSession(ok);

                if (!ok) {
                    toast.error("Link inválido ou expirado.", {
                        description: "Pede novamente a recuperação de senha.",
                    });
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Erro ao validar link";
                toast.error("❌ Não foi possível validar o link", { description: message });
                setHasSession(false);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    // 2) Atualizar senha
    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        if (!isStrongEnough(password)) {
            toast.error("Senha fraca.", { description: "Usa pelo menos 8 caracteres." });
            return;
        }

        if (password !== confirm) {
            toast.error("As senhas não batem.");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast.success("✅ Senha atualizada!");

            // Opcional: deslogar e mandar pro login
            await supabase.auth.signOut();
            navigate("/login", { replace: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao atualizar senha";
            toast.error("❌ Não foi possível atualizar", { description: message });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">
                A validar link...
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,.65), rgba(0,0,0,.65)), url(${heroBg})`,
            }}
        >
            <form
                onSubmit={handleSave}
                className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4"
            >
                <h1 className="text-2xl font-bold">Definir nova senha</h1>

                {!hasSession ? (
                    <p className="text-sm text-muted-foreground">
                        Esse link não é válido/expirou. Volta e pede novamente em “Esqueci minha senha”.
                    </p>
                ) : (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm">Nova senha</label>
                            <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                autoComplete="new-password"
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm">Confirmar nova senha</label>
                            <Input
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                type="password"
                                autoComplete="new-password"
                                disabled={saving}
                            />
                        </div>

                        <Button className="w-full" type="submit" disabled={saving}>
                            {saving ? "Salvando..." : "Atualizar senha"}
                        </Button>
                    </>
                )}
            </form>
        </div>
    );
}
