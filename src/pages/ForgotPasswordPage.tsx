import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import heroBg from "@/assets/hero-grelhados.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            toast.error("Preenche o email.");
            return;
        }

        setLoading(true);
        try {
            const redirectTo = `${window.location.origin}/reset-password`;

            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo,
            });

            if (error) throw error;

            toast.success("✅ Email enviado!", {
                description: "Verifica a tua caixa de entrada (e o spam).",
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao enviar email";
            toast.error("❌ Não foi possível enviar", { description: message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,.65), rgba(0,0,0,.65)), url(${heroBg})`,
            }}
        >
            <form
                onSubmit={handleSend}
                className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4"
            >
                <h1 className="text-2xl font-bold">Recuperar senha</h1>

                <p className="text-sm text-muted-foreground">
                    Digita o teu email. Vamos enviar um link para definires uma nova senha.
                </p>

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

                <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link"}
                </Button>
            </form>
        </div>
    );
}
