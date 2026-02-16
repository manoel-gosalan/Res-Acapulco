// src/components/cart/CartDrawer.tsx (ajusta o path se for outro)
import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";

import { getMyProfile } from "@/services/profile.service";
import { getMyDefaultAddress } from "@/services/addresses.service";

type CartDrawerProps = {
  onClose: () => void;
};

type DeliveryType = "takeaway" | "delivery";

const LUNCH_START = 11 * 60 + 30; // 11:30
const LUNCH_END = 14 * 60; // 14:00
const DINNER_START = 18 * 60 + 15; // 18:15
const DINNER_END = 21 * 60; // 21:00

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function normalizePhonePT(phone: string) {
  const digits = onlyDigits(phone);
  if (digits.length === 9) return `351${digits}`; // PT sem indicativo
  return digits;
}

/** Converte "HH:MM" em minutos do dia. */
function timeToMinutes(time: string): number | null {
  const trimmed = time.trim();
  const match = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/** Horário válido = dentro do expediente (almoço ou jantar). */
function isWithinBusinessHours(time: string): boolean {
  const totalMinutes = timeToMinutes(time);
  if (totalMinutes == null) return false;

  const isLunch = totalMinutes >= LUNCH_START && totalMinutes <= LUNCH_END;
  const isDinner = totalMinutes >= DINNER_START && totalMinutes <= DINNER_END;

  return isLunch || isDinner;
}

function normalizeTimeInput(raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  const cleaned = v.replace(/[^\d:]/g, "");

  if (cleaned.includes(":")) {
    const [hRaw, mRaw = ""] = cleaned.split(":");

    const hDigits = hRaw.replace(/\D/g, "").slice(0, 2);
    if (!hDigits) return "";
    if (hDigits.length < 2) return hDigits;

    const hour = Number(hDigits);
    if (hour > 23) return "23";

    const mDigits = mRaw.replace(/\D/g, "").slice(0, 2);

    if (mRaw === "" && cleaned.endsWith(":")) return `${hDigits}:`;
    if (mDigits.length === 1) return `${hDigits}:${mDigits}`;

    if (mDigits.length === 2) {
      const min = Number(mDigits);
      if (min > 59) return `${hDigits}:59`;
      return `${hDigits}:${mDigits}`;
    }

    return `${hDigits}`;
  }

  const digits = cleaned.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    const hour = Number(digits);
    if (Number.isNaN(hour)) return "";
    if (hour > 23) return "23";
    return digits;
  }

  if (digits.length === 3) {
    const h = Number(digits.slice(0, 2));
    const m = Number(digits.slice(2));
    if (h > 23) return "23";
    if (m > 9)
      return `${String(Math.min(h, 23)).padStart(2, "0")}:${String(m).padStart(2, "0").slice(0, 2)}`;
    return `${String(h).padStart(2, "0")}:0${m}`;
  }

  const h = Number(digits.slice(0, 2));
  const m = Number(digits.slice(2));
  const hh = Math.min(h, 23);
  const mm = Math.min(m, 59);

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function finalizeTimeOnBlur(raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  if (timeToMinutes(v) != null) return v;

  const normalized = normalizeTimeInput(v);

  if (/^([01]?\d|2[0-3])$/.test(normalized)) {
    return `${String(Number(normalized)).padStart(2, "0")}:00`;
  }

  if (/^([01]\d|2[0-3]):$/.test(normalized)) {
    return `${normalized}00`;
  }

  const partialMin = normalized.match(/^([01]\d|2[0-3]):([0-5])$/);
  if (partialMin) {
    return `${partialMin[1]}:0${partialMin[2]}`;
  }

  return normalized;
}

export function CartDrawer({ onClose }: CartDrawerProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const deliveryEnabled = settings?.delivery_enabled ?? true;

  // ✅ teu novo contrato do CartContext
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    customerNotes,
    setCustomerNotes,
    finalObservations,
  } = useCart();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("takeaway");

  // Nome + Apelido + Telefone
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [orderAddress, setOrderAddress] = useState("");
  const [orderTime, setOrderTime] = useState("");

  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canCheckout = items.length > 0;

  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.price ?? 0) * it.quantity, 0);
  }, [items]);

  function handleCloseSafe() {
    onClose();
  }

  /** Prefill: nome + telefone do profile (quando logado). */
  useEffect(() => {
    let alive = true;

    async function prefillProfile() {
      if (!user) return;

      setLoadingPrefill(true);
      try {
        const profile = await getMyProfile();
        if (!alive) return;

        const full = (profile?.full_name ?? "").trim();
        if (full) {
          const parts = full.split(/\s+/);
          setFirstName(parts[0] ?? "");
          setLastName(parts.slice(1).join(" ") || "");
        }

        if (profile?.phone) setPhone(String(profile.phone));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoadingPrefill(false);
      }
    }

    prefillProfile();
    return () => {
      alive = false;
    };
  }, [user]);

  /**
   * Prefill: morada default apenas quando:
   * - logado
   * - entregas ligadas
   * - usuário escolheu "Entrega"
   * - campo está vazio
   */
  useEffect(() => {
    let alive = true;

    async function prefillAddressIfNeeded() {
      if (!user) return;
      if (!deliveryEnabled) return;
      if (deliveryType !== "delivery") return;
      if (orderAddress.trim()) return;

      try {
        const addr = await getMyDefaultAddress();
        if (!alive) return;
        if (addr) setOrderAddress(addr);
      } catch (e) {
        console.error(e);
      }
    }

    prefillAddressIfNeeded();
    return () => {
      alive = false;
    };
  }, [user, deliveryType, deliveryEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Se entregas estiverem OFF, força recolha e limpa morada. */
  useEffect(() => {
    if (!deliveryEnabled) {
      setDeliveryType("takeaway");
      setOrderAddress("");
    }
  }, [deliveryEnabled]);

  async function handleCheckout() {
    if (!canCheckout) {
      toast.message("Carrinho vazio 🙂");
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();
    const phoneFinal = normalizePhonePT(phone);

    // ✅ regras obrigatórias (mesmo guest)
    if (fn.length < 2) {
      toast.error("Informe o teu nome.");
      return;
    }
    if (ln.length < 2) {
      toast.error("Informe o teu apelido.");
      return;
    }
    if (!phoneFinal) {
      toast.error("Informe um telefone válido.");
      return;
    }

    const time = orderTime.trim();
    if (time && !isWithinBusinessHours(time)) {
      toast.error("Horário fora do expediente", {
        description: "🍽️ 11:30-14:00 | 🌙 18:15-21:00",
      });
      return;
    }

    if (deliveryType === "delivery") {
      if (!deliveryEnabled) {
        toast.error("Entregas desativadas. Escolhe Recolha.");
        return;
      }
      if (!orderAddress.trim() || orderAddress.trim().length < 8) {
        toast.error("Informe a morada para entrega.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // ✅ RPC: cria pedido direto no Supabase
      const { data, error } = await supabase.rpc("create_public_order", {
        p_delivery_type: deliveryType,
        p_customer_name: `${fn} ${ln}`.trim(),
        p_customer_phone: phoneFinal,
        p_address_line: deliveryType === "delivery" ? orderAddress.trim() : null,
        p_requested_time: time ? time : null,
        p_observations: finalObservations?.trim() || null,
        p_items: items.map((it) => ({
          id: it.productId,
          name: it.name,
          price: it.price ?? null,
          quantity: it.quantity,
        })),
        p_total: total,
      });

      if (error) throw error;

      const createdId = data?.id;

      toast.success("✅ Pedido enviado!", {
        description: createdId
          ? `Nº ${String(createdId).slice(0, 8)} • Aguardando confirmação do restaurante.`
          : "Pedido criado com sucesso.",
      });

      clearCart();
      handleCloseSafe();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro ao enviar pedido";
      toast.error("❌ Não foi possível enviar o pedido", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const timeIsInvalid = !!orderTime.trim() && !isWithinBusinessHours(orderTime.trim());

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-black/50 transition-opacity"
          onClick={handleCloseSafe}
          aria-hidden="true"
        />

        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md">
            <div className="flex h-full flex-col bg-background shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border p-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">O teu pedido</h2>
                  <p className="text-sm text-muted-foreground">
                    {loadingPrefill ? "A carregar teus dados..." : "Confirma os itens e finaliza"}
                  </p>
                </div>

                <Button variant="ghost" size="icon" onClick={handleCloseSafe} className="-mr-2">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Itens */}
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="text-muted-foreground text-center py-10">O teu carrinho está vazio.</div>
                  ) : (
                    items.map((item) => {
                      const itemTotal = (item.price ?? 0) * item.quantity;

                      return (
                        <div key={item.lineId} className="p-3 bg-card rounded-xl border border-border">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.price != null ? `${item.price.toFixed(2)}€ cada` : "Sob consulta"}
                              </div>
                            </div>

                            <div className="text-sm font-semibold text-primary">
                              {item.price != null ? `${itemTotal.toFixed(2)}€` : ""}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                                disabled={item.quantity <= 1 || submitting}
                                type="button"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>

                              <span className="w-8 text-center font-semibold">{item.quantity}</span>

                              <Button
                                variant="fire"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                                disabled={submitting}
                                type="button"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.lineId)}
                              disabled={submitting}
                              type="button"
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Form */}
                <div className="space-y-4">
                  {/* Nome + Apelido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ex: Manoel"
                        disabled={submitting}
                        autoComplete="given-name"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Apelido</label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ex: Santos"
                        disabled={submitting}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: 928353342 ou 351928353342"
                      inputMode="tel"
                      autoComplete="tel"
                      disabled={submitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Dica: podes escrever só 9 dígitos (assumimos 351).</p>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Tipo</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={deliveryType === "delivery" ? "fire" : "secondary"}
                        disabled={!deliveryEnabled || submitting}
                        onClick={() => setDeliveryType("delivery")}
                        className="flex-1"
                      >
                        Entrega
                      </Button>

                      <Button
                        type="button"
                        variant={deliveryType === "takeaway" ? "fire" : "secondary"}
                        disabled={submitting}
                        onClick={() => setDeliveryType("takeaway")}
                        className="flex-1"
                      >
                        Recolha
                      </Button>
                    </div>

                    {!deliveryEnabled && (
                      <p className="text-xs text-muted-foreground mt-2">
                        🚫 Entregas temporariamente desativadas — apenas recolha disponível.
                      </p>
                    )}
                  </div>

                  {deliveryType === "delivery" ? (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Morada de entrega</label>
                      <Input
                        value={orderAddress}
                        onChange={(e) => setOrderAddress(e.target.value)}
                        placeholder="Rua, número, andar..."
                        disabled={!deliveryEnabled || submitting}
                        autoComplete="street-address"
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <p className="text-sm text-muted-foreground">✅ Recolha no Restaurante</p>
                    </div>
                  )}

                  {/* Hora */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Hora pretendida</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 13 ou 13:30"
                      value={orderTime}
                      onChange={(e) => setOrderTime(normalizeTimeInput(e.target.value))}
                      onBlur={() => setOrderTime((v) => finalizeTimeOnBlur(v))}
                      maxLength={5}
                      disabled={submitting}
                      className={timeIsInvalid ? "border-destructive focus:ring-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">🍽️ 11:30-14:00 | 🌙 18:15-21:00</p>
                    {timeIsInvalid && (
                      <p className="text-xs text-destructive mt-1 font-semibold">⚠️ Horário fora do expediente</p>
                    )}
                  </div>

                  {/* Observações (cliente) */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Observações</label>
                    <Textarea
                      placeholder="Alergias, instruções especiais..."
                      value={customerNotes ?? ""}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={3}
                      disabled={submitting}
                    />
                    {!!finalObservations?.trim() && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                        <span className="font-semibold">Resumo que vai no pedido:</span>
                        {"\n"}
                        {finalObservations}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex justify-between text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{total.toFixed(2)} €</span>
                </div>

                <Button
                  variant="fire"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={!canCheckout || submitting}
                  type="button"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? "Enviando..." : "Finalizar pedido"}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={clearCart}
                    disabled={!canCheckout || submitting}
                    type="button"
                  >
                    Limpar carrinho
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleCloseSafe}
                    disabled={submitting}
                    type="button"
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
