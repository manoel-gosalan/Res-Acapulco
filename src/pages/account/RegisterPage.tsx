import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import heroBg from "@/assets/hero-grelhados.jpg";

import { supabase } from "@/lib/supabase";
import { addAddress, setDefaultAddress } from "@/services/addresses.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Normaliza telefone para guardar (digits). Se vier 9 dígitos, assume 351. */
function normalizePhonePT(phone: string) {
  const digits = onlyDigits(phone.trim());
  if (!digits) return "";
  if (digits.length === 9) return `351${digits}`;
  return digits;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      onlyDigits(phone).length >= 9 &&
      addressLine.trim().length >= 8 &&
      normalizeEmail(email).length >= 5 &&
      password.length >= 6
    );
  }, [firstName, lastName, phone, addressLine, email, password]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const phoneFinal = normalizePhonePT(phone);
    const addrFinal = addressLine.trim();

    if (!canSubmit) {
      toast.error("Preenche nome, apelido, telefone, morada, email e senha (mínimo 6).");
      return;
    }

    setLoading(true);
    try {
      /**
       * 1) Cria user no Supabase Auth
       * ✅ Guarda os dados no user_metadata SEMPRE (funciona mesmo com confirm email ON)
       */
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phoneFinal,
            address_line: addrFinal,
          },
        },
      });

      if (error) throw error;

      const user = data.user;
      const session = data.session;

      /**
       * Se confirm email estiver ON, session pode vir null.
       * Nesse caso: não dá pra escrever nas tabelas (RLS).
       * ✅ Mas os dados já ficaram no user_metadata.
       */
      if (!session || !user) {
        toast.success("Conta criada!", {
          description: "Confirma o email para ativar a conta. Depois faz login — os teus dados já ficam guardados.",
        });
        navigate("/login", { replace: true });
        return;
      }

      /**
       * 2) Com sessão ativa (confirm email OFF), salva já no banco
       * - profiles (nome + telefone)
       */
      const upsertProfile = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName,
            phone: phoneFinal,
            role: "user",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertProfile.error) throw upsertProfile.error;

      /**
       * 3) Morada default + sincroniza default no profile
       */
      const addr = await addAddress({
        label: "Casa",
        address_line: addrFinal,
        is_default: true,
      });

      await setDefaultAddress(addr.id);

      toast.success("✅ Cadastro concluído!");
      navigate("/account", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast.error("❌ Não foi possível cadastrar", { description: msg });
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
        onSubmit={handleRegister}
        className="w-full max-w-md bg-card/95 backdrop-blur border border-border rounded-xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Criar conta</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-sm">Nome</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="Ex: Lídio"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Apelido</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              placeholder="Ex: Silva"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Telefone</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ex: 928353342 ou 351928353342"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Dica: pode escrever só o número (9 dígitos) que a gente assume 351.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Morada</label>
          <Input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="Rua, número, andar..."
            autoComplete="street-address"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="email@exemplo.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Senha</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="mínimo 6 caracteres"
            disabled={loading}
          />
        </div>

        <Button className="w-full" type="submit" disabled={loading || !canSubmit}>
          {loading ? "Criando..." : "Criar conta"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => navigate("/login")}
          disabled={loading}
        >
          Já tenho conta → Entrar
        </Button>
      </form>
    </div>
  );
}
