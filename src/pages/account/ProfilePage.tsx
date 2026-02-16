import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

import { getMyProfile, updateMyProfile } from "@/services/profile.service";
import { getMyDefaultAddress, upsertMyDefaultAddress } from "@/services/addresses.service";

type ProfileDTO = {
  full_name: string | null;
  phone: string | null;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

/** Normaliza telefone para guardar (digits). Se vier 9 dígitos, assume 351. */
function normalizePhonePT(phone: string) {
  const digits = onlyDigits(phone.trim());
  if (!digits) return "";
  if (digits.length === 9) return `351${digits}`;
  return digits;
}

function prettyValue(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s ? s : "—";
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  // snapshot do servidor
  const [profile, setProfile] = useState<ProfileDTO>({ full_name: "", phone: "" });
  const [address, setAddress] = useState<string>("");

  // drafts
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");

  // edição por campo
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);

  const [savingField, setSavingField] = useState<"name" | "phone" | "address" | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [p, addr] = await Promise.all([getMyProfile(), getMyDefaultAddress()]);
        if (!alive) return;

        const normalized: ProfileDTO = {
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
        };

        setProfile(normalized);
        setNameDraft(normalized.full_name ?? "");
        setPhoneDraft(normalized.phone ?? "");

        const addrStr = (addr ?? "").trim();
        setAddress(addrStr);
        setAddressDraft(addrStr);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar teus dados.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const nameChanged = useMemo(() => {
    return nameDraft.trim() !== (profile.full_name ?? "").trim();
  }, [nameDraft, profile.full_name]);

  const phoneChanged = useMemo(() => {
    const a = normalizePhonePT(phoneDraft);
    const b = normalizePhonePT(profile.phone ?? "");
    return a !== b;
  }, [phoneDraft, profile.phone]);

  const addressChanged = useMemo(() => {
    return addressDraft.trim() !== (address ?? "").trim();
  }, [addressDraft, address]);

  const profileComplete = useMemo(() => {
    const hasName = (profile.full_name ?? "").trim().length >= 2;
    const hasPhone = (profile.phone ?? "").trim().length >= 9; // armazenado como digits, normalmente >= 9/10
    const hasAddress = (address ?? "").trim().length >= 8; // regra leve
    return hasName && hasPhone && hasAddress;
  }, [profile.full_name, profile.phone, address]);

  async function saveName() {
    if (!user) return toast.error("Precisas estar logado para salvar.");

    const full_name = nameDraft.trim();
    if (full_name.length < 2) return toast.error("O nome é obrigatório (mínimo 2 letras).");
    if (!nameChanged) return setEditingName(false);

    setSavingField("name");
    try {
      await updateMyProfile({
        full_name,
        phone: (profile.phone ?? "").trim() || null,
      });

      setProfile((prev) => ({ ...prev, full_name }));
      setNameDraft(full_name);
      toast.success("✅ Nome atualizado!");
      setEditingName(false);
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível salvar o nome.");
    } finally {
      setSavingField(null);
    }
  }

  async function savePhone() {
    if (!user) return toast.error("Precisas estar logado para salvar.");

    const rawDigits = onlyDigits(phoneDraft);
    if (rawDigits && rawDigits.length < 9) {
      return toast.error("Informe um telefone válido (mínimo 9 dígitos).");
    }

    const phoneNorm = normalizePhonePT(phoneDraft);
    const phoneToSave = phoneNorm ? phoneNorm : null;

    if (!phoneChanged) return setEditingPhone(false);

    setSavingField("phone");
    try {
      await updateMyProfile({
        full_name: (profile.full_name ?? "").trim() || null,
        phone: phoneToSave,
      });

      setProfile((prev) => ({ ...prev, phone: phoneToSave ?? "" }));
      setPhoneDraft(phoneToSave ?? "");
      toast.success("✅ Telefone atualizado!");
      setEditingPhone(false);
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível salvar o telefone.");
    } finally {
      setSavingField(null);
    }
  }

  async function saveAddress() {
    if (!user) return toast.error("Precisas estar logado para salvar.");

    const line = addressDraft.trim();
    if (line.length < 8) return toast.error("Informe uma morada válida (mínimo 8 caracteres).");
    if (!addressChanged) return setEditingAddress(false);

    setSavingField("address");
    try {
      await upsertMyDefaultAddress(line);

      setAddress(line);
      setAddressDraft(line);

      toast.success("✅ Morada atualizada!");
      setEditingAddress(false);
    } catch (e) {
      console.error(e);
      toast.error("❌ Não foi possível salvar a morada.");
    } finally {
      setSavingField(null);
    }
  }

  function cancelName() {
    setNameDraft(profile.full_name ?? "");
    setEditingName(false);
  }
  function cancelPhone() {
    setPhoneDraft(profile.phone ?? "");
    setEditingPhone(false);
  }
  function cancelAddress() {
    setAddressDraft(address ?? "");
    setEditingAddress(false);
  }

  if (!user) {
    return <div className="text-muted-foreground">Faz login para veres e editares teus dados.</div>;
  }

  if (loading) {
    return <div className="text-muted-foreground">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Teu perfil</h2>
          <p className="text-sm text-muted-foreground">
            Estes dados ajudam no pedido e na confirmação pelo restaurante.
          </p>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border ${
            profileComplete
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
          }`}
        >
          {profileComplete ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {profileComplete ? "Perfil completo" : "Perfil incompleto"}
        </div>
      </div>

      {/* NOME */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">Nome</div>

            {!editingName ? (
              <div className="text-base font-semibold text-foreground truncate">
                {prettyValue(profile.full_name)}
              </div>
            ) : (
              <div className="mt-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Teu nome"
                  autoComplete="name"
                  disabled={savingField === "name"}
                />
                <div className="text-xs text-muted-foreground mt-2">Mínimo 2 letras.</div>
              </div>
            )}
          </div>

          {!editingName ? (
            <Button type="button" variant="secondary" onClick={() => setEditingName(true)} disabled={savingField !== null}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={cancelName} disabled={savingField === "name"}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="fire"
                onClick={saveName}
                disabled={savingField === "name" || !nameDraft.trim() || !nameChanged}
              >
                {savingField === "name" ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* TELEFONE */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">Telefone</div>

            {!editingPhone ? (
              <div className="text-base font-semibold text-foreground truncate">
                {prettyValue(profile.phone)}
              </div>
            ) : (
              <div className="mt-2">
                <Input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="Ex: 928353342 ou 351928353342"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={savingField === "phone"}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Dica: podes escrever só 9 dígitos (assumimos 351).
                </div>
              </div>
            )}
          </div>

          {!editingPhone ? (
            <Button type="button" variant="secondary" onClick={() => setEditingPhone(true)} disabled={savingField !== null}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={cancelPhone} disabled={savingField === "phone"}>
                Cancelar
              </Button>
              <Button type="button" variant="fire" onClick={savePhone} disabled={savingField === "phone" || !phoneChanged}>
                {savingField === "phone" ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MORADA DEFAULT */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">Morada (default)</div>

            {!editingAddress ? (
              <div className="text-base font-semibold text-foreground truncate">
                {prettyValue(address)}
              </div>
            ) : (
              <div className="mt-2">
                <Input
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                  placeholder="Rua, número, andar..."
                  autoComplete="street-address"
                  disabled={savingField === "address"}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Esta morada aparece automaticamente quando escolheres “Entrega”.
                </div>
              </div>
            )}
          </div>

          {!editingAddress ? (
            <Button type="button" variant="secondary" onClick={() => setEditingAddress(true)} disabled={savingField !== null}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={cancelAddress} disabled={savingField === "address"}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="fire"
                onClick={saveAddress}
                disabled={savingField === "address" || !addressDraft.trim() || !addressChanged}
              >
                {savingField === "address" ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        ⚠️ O telefone é usado para o restaurante te notificar no WhatsApp. A morada default ajuda a preencher entrega automaticamente.
      </div>
    </div>
  );
}
