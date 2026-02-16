import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AppSettings = {
  id: number;
  delivery_enabled: boolean;
};

const SETTINGS_ID = 1;

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("app_settings")
      .select("id, delivery_enabled")
      .eq("id", SETTINGS_ID)
      .single();

    if (error) {
      console.error("[useSettings] load error:", error);
      setSettings(null);
    } else {
      setSettings(data as AppSettings);
    }

    setLoading(false);
  }

  async function setDeliveryEnabled(enabled: boolean) {
    // garante que existe linha
    if (!settings) {
      // tenta carregar e depois falha com msg clara
      await load();
      if (!settings) throw new Error("Settings row not loaded");
    }

    // Optimistic update (UI responde instantâneo)
    setSettings((prev) => (prev ? { ...prev, delivery_enabled: enabled } : prev));

    const { error } = await supabase
      .from("app_settings")
      .update({ delivery_enabled: enabled })
      .eq("id", SETTINGS_ID);

    if (error) {
      console.error("[useSettings] update error:", error);
      // reverte se der erro
      setSettings((prev) => (prev ? { ...prev, delivery_enabled: !enabled } : prev));
      throw error;
    }
  }

  useEffect(() => {
    load();

    // realtime: se admin mudar, menu atualiza
    const ch = supabase
      .channel("settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { settings, loading, reload: load, setDeliveryEnabled };
}
