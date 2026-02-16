import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  default_address_id: string | null;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getMyProfile(): Promise<ProfileRow | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, default_address_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Upsert do próprio profile (id = auth.uid())
 * - ideal para hidratar dados vindos do metadata após confirmar email
 */
export async function upsertMyProfile(payload: {
  full_name?: string | null;
  phone?: string | null;
  default_address_id?: string | null;
}) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, full_name, phone, default_address_id")
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

export async function updateMyProfile(payload: {
  full_name?: string | null;
  phone?: string | null;
  default_address_id?: string | null;
}) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, full_name, phone, default_address_id")
    .single();

  if (error) throw error;
  return data as ProfileRow;
}
