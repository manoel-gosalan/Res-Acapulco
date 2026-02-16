import { supabase } from "@/lib/supabase";

export type CustomerAddress = {
  id: string;
  label: string | null;
  address_line: string;
  notes: string | null;
  is_default: boolean;
  created_at: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  return user.id;
}

/**
 * Lista endereços do utilizador (default primeiro, depois mais recentes).
 */
export async function listMyAddresses(): Promise<CustomerAddress[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("id, label, address_line, notes, is_default, created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CustomerAddress[];
}

/**
 * Retorna a morada default do user.
 * Fallback: se não houver default, retorna a morada mais recente.
 */
export async function getMyDefaultAddress(): Promise<string | null> {
  const userId = await requireUserId();

  // 1) tenta default
  const { data: def, error: defErr } = await supabase
    .from("customer_addresses")
    .select("address_line")
    .eq("user_id", userId)
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (defErr) throw defErr;
  if (def?.address_line) return def.address_line;

  // 2) fallback: mais recente
  const { data: last, error: lastErr } = await supabase
    .from("customer_addresses")
    .select("address_line")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastErr) throw lastErr;
  return last?.address_line ?? null;
}

export async function addAddress(payload: {
  label?: string;
  address_line: string;
  notes?: string;
  is_default?: boolean;
}): Promise<CustomerAddress> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      user_id: userId,
      label: payload.label ?? null,
      address_line: payload.address_line,
      notes: payload.notes ?? null,
      is_default: payload.is_default ?? false,
    })
    .select("id, label, address_line, notes, is_default, created_at")
    .single();

  if (error) throw error;
  return data as CustomerAddress;
}

/**
 * Define um endereço como default:
 * - desmarca todos
 * - marca o escolhido
 * - (opcional) salva no profiles.default_address_id, se essa coluna existir no teu schema
 */
export async function setDefaultAddress(addressId: string): Promise<void> {
  const userId = await requireUserId();

  // 1) desmarca todas
  const { error: aErr } = await supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (aErr) throw aErr;

  // 2) marca a escolhida
  const { error: bErr } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", userId);

  if (bErr) throw bErr;

  // 3) opcional: tenta salvar no profile (não quebra se a coluna não existir)
  const { error: cErr } = await supabase
    .from("profiles")
    .update({ default_address_id: addressId })
    .eq("id", userId);

  // Se teu schema não tiver default_address_id, isso dá erro.
  // Em vez de quebrar o fluxo, só loga.
  if (cErr) {
    console.warn("[setDefaultAddress] Não foi possível atualizar profiles.default_address_id:", cErr.message);
  }
}

/**
 * Define/Cria a morada default a partir de um texto (address_line).
 * - Se já existir uma morada igual do user, marca ela como default.
 * - Se não existir, cria uma nova e marca como default.
 */


export async function upsertMyDefaultAddress(addressLine: string): Promise<void> {
  const userId = await requireUserId();
  const line = addressLine.trim();
  if (line.length < 8) throw new Error("Address too short");

  // 1) pega a default atual (se existir)
  const { data: def, error: defErr } = await supabase
    .from("customer_addresses")
    .select("id, address_line")
    .eq("user_id", userId)
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (defErr) throw defErr;

  // se já existe default, só atualiza a linha (não duplica)
  if (def?.id) {
    const { error: updErr } = await supabase
      .from("customer_addresses")
      .update({ address_line: line })
      .eq("id", def.id)
      .eq("user_id", userId);

    if (updErr) throw updErr;

    // garante profile.default_address_id alinhado
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ default_address_id: def.id })
      .eq("id", userId);

    if (profErr) console.warn("[upsertMyDefaultAddress] profile default_address_id update failed:", profErr.message);
    return;
  }

  // 2) não tem default => cria e seta
  const addr = await addAddress({
    label: "Casa",
    address_line: line,
    is_default: true,
  });

  await setDefaultAddress(addr.id);
}
