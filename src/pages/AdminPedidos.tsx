import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, AlertCircle, LogOut, RefreshCw, Filter, Pencil } from "lucide-react";
import type { Pedido } from "@/types/pedido";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import DailyMenuOverlay from "@/components/admin/DailyMenuOverlay";
import { UtensilsCrossed } from "lucide-react";

type PedidoStatus = "pending" | "accepted" | "preparing" | "rejected";
type AnyOrderItem = { quantity: number; name: string; price?: number | null };

type RawPedidoData = {
  // novo
  customer_name?: string | null;
  customer_phone?: string | null;
  address_line?: string | null;
  delivery_type?: string | null;
  requested_time?: string | null;
  observations?: string | null;
  items?: unknown;

  // legado
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  cliente_endereco?: string | null;
  tipo_entrega?: string | null;
  hora_solicitada?: string | null;
  hora_confirmada?: string | null;
  observacoes_cliente?: string | null;
  observacoes_admin?: string | null;
  itens?: unknown;

  total?: number | string | null;
  created_at?: string | null;
};

function yyyyMmDd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseItems(value: unknown): AnyOrderItem[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as AnyOrderItem[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as AnyOrderItem[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getItens(p: RawPedidoData): AnyOrderItem[] {
  const newer = parseItems(p.items);
  if (newer.length > 0) return newer;
  return parseItems(p.itens);
}

function getClienteNome(p: RawPedidoData): string {
  return (p.customer_name ?? p.cliente_nome ?? "—") as string;
}

function getEndereco(p: RawPedidoData): string {
  return (p.address_line ?? p.cliente_endereco ?? "—") as string;
}

function getTipoEntrega(p: RawPedidoData): "delivery" | "takeaway" {
  return (p.delivery_type ?? p.tipo_entrega ?? "takeaway") as "delivery" | "takeaway";
}

function getHoraSolicitada(p: RawPedidoData): string {
  return (p.requested_time ?? p.hora_solicitada ?? "—") as string;
}

function getHoraConfirmada(p: RawPedidoData): string | null {
  return (p.hora_confirmada ?? null) as string | null;
}

function getObservacoesCliente(p: RawPedidoData): string | null {
  return (p.observations ?? p.observacoes_cliente ?? null) as string | null;
}

function getObservacoesAdmin(p: RawPedidoData): string | null {
  return (p.observacoes_admin ?? null) as string | null;
}

function money(n: number | string | null | undefined) {
  const v = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

/** Normaliza telefone para wa.me (somente dígitos). */
function normalizePhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // se veio com 9 dígitos (PT sem 351) -> assume 351
  if (digits.length === 9) return `351${digits}`;

  return digits.length >= 10 ? digits : null;
}

function buildMensagemCliente({
  pedidoId,
  pedido,
  kind,
  motivo,
}: {
  pedidoId: string;
  pedido: RawPedidoData;
  kind: "accepted" | "edited" | "rejected";
  motivo?: string;
}) {
  const nome = getClienteNome(pedido);
  const hora = getHoraConfirmada(pedido) || getHoraSolicitada(pedido);
  const total = money(pedido.total);
  const tipo = getTipoEntrega(pedido) === "delivery" ? "Entrega" : "Recolha";
  const idCurto = pedidoId.slice(0, 8).toUpperCase();

  if (kind === "accepted") {
    return [
      `Olá ${nome}! `,
      `O seu pedido (#${idCurto}) foi ACEITE pelo Restaurante Acapulco.`,
      hora ? `Hora confirmada: ${hora}` : null,
      `Tipo: ${tipo}`,
      `Total: ${total}€`,
      motivo ? `Obs do restaurante: ${motivo}` : null,
      `Obrigado pela preferência!`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (kind === "edited") {
    return [
      `Olá ${nome}! `,
      `O seu pedido (#${idCurto}) foi AJUSTADO pelo restaurante.`,
      hora ? `Hora atualizada: ${hora}` : null,
      `Motivo: ${motivo ?? "(não informado)"}`,
      `Por favor, entre em contacto com o restaurante para mais informações.`,
      `Tel: 232 421 996`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // rejected
  return [
    `Olá ${nome}! `,
    `O seu pedido (#${idCurto}) foi REJEITADO pelo restaurante.`,
    `Motivo: ${motivo ?? "(não informado)"}`,
    `Por favor, entre em contacto com o restaurante para mais informações.`,
    `Tel: 232 421 996`,
  ].join("\n");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function printTextViaIframe(textoPedido: string) {
  // cria iframe invisível
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Print iframe not available");
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Pedido</title>
        <style>
          body { margin: 0; padding: 0; }
          pre { font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(textoPedido)}</pre>
      </body>
    </html>
  `);
  doc.close();

  // espera renderizar
  await new Promise((r) => setTimeout(r, 50));

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // remove depois (não remove instantâneo pra não cancelar print)
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {/* ignore audio error */}
  }, 1000);
}


export default function AdminPedidos() {
  const navigate = useNavigate();

  const { loading: settingsLoading, setDeliveryEnabled, settings } = useSettings();
  const deliveryEnabled = settings?.delivery_enabled ?? true;
  const [rtConnected, setRtConnected] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);


  const [menuOpen, setMenuOpen] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ estado por pedido
  const [horaById, setHoraById] = useState<Record<string, string>>({});
  const [obsById, setObsById] = useState<Record<string, string>>({});

  // Filtro por data (default: hoje)
  const [dataFiltro, setDataFiltro] = useState<string>(() => yyyyMmDd(new Date()));

  // ✅ fix: ref para evitar dataFiltro "congelado" no realtime
  const dataFiltroRef = useRef(dataFiltro);
  useEffect(() => {
    dataFiltroRef.current = dataFiltro;
  }, [dataFiltro]);

  async function toggleDelivery() {
    try {
      await setDeliveryEnabled(!deliveryEnabled);
    } catch (e) {
      console.error(e);
      alert("Não foi possível alterar o estado das entregas.");
    }
  }

  async function carregarPedidos(dateYYYYMMDD: string) {
    setLoading(true);
    try {
      const start = new Date(`${dateYYYYMMDD}T00:00:00.000Z`).toISOString();
      const end = new Date(`${dateYYYYMMDD}T23:59:59.999Z`).toISOString();

      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .in("status", ["pending", "accepted", "preparing", "rejected"])
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos((data || []) as Pedido[]);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  }

  // Carrega pedidos + real-time
  useEffect(() => {
  let alive = true;

  const refresh = async () => {
    await carregarPedidos(dataFiltroRef.current);
    if (!alive) return;
    setLastRefreshAt(new Date().toISOString());
  };

  // primeiro load
  refresh();

  // realtime (funciona quando você habilitar no supabase)
  const channel = supabase
    .channel("pedidos_changes_admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, async (payload) => {
      await refresh();
      if (payload.eventType === "INSERT") {
        new Audio("/notification.mp3").play().catch(() => { /* ignore audio error */ });
      }
    })
    .subscribe((status) => {
      if (!alive) return;
      setRtConnected(status === "SUBSCRIBED");
      console.log("[Realtime] status:", status);
    });

  // ✅ polling SEMPRE (cozinha mode)
  const interval = setInterval(() => {
    refresh();
  }, 20000);

  return () => {
    alive = false;
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}, []);




  async function sair() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (e) {
      console.error(e);
      alert("Não foi possível sair. Tenta novamente.");
    }
  }

  function buildWhatsAppUrl(pedidoId: string, kind: "accepted" | "edited" | "rejected", motivo?: string) {
    const pedido = (pedidos.find((p) => p.id === pedidoId) as unknown as RawPedidoData) || null;
    if (!pedido) return null;

    const telefone = normalizePhone((pedido.customer_phone ?? pedido.cliente_telefone) as string | null);

    if (!telefone) {
      alert("Pedido sem telefone do cliente (customer_phone).");
      return null;
    }

    const motivoFinal = (obsById[pedidoId] || motivo || getObservacoesAdmin(pedido) || "").trim();
    const horaFinal = (horaById[pedidoId] || getHoraConfirmada(pedido) || getHoraSolicitada(pedido) || "").trim();

    const mensagem = buildMensagemCliente({
      pedidoId,
      pedido: {
        ...pedido,
        hora_confirmada: horaFinal || getHoraConfirmada(pedido) || null,
      },
      kind,
      motivo: motivoFinal || undefined,
    });

    return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  }

  async function enviarParaImpressora(pedidoId: string) {
  const pedido = (pedidos.find((p) => p.id === pedidoId) as unknown as RawPedidoData) || null;
  if (!pedido) return;

  const itens = getItens(pedido);

  const textoPedido = `
=====================================
       ACAPULCO TAKE AWAY
=====================================
Pedido: #${pedidoId.slice(0, 8)}
Data: ${new Date().toLocaleString("pt-PT")}
-------------------------------------
Cliente: ${getClienteNome(pedido)}
Endereço: ${getEndereco(pedido)}
Hora: ${getHoraConfirmada(pedido) || getHoraSolicitada(pedido)}
Tipo: ${getTipoEntrega(pedido) === "delivery" ? "ENTREGA" : "LEVANTAR"}
-------------------------------------
ITENS:
${itens
    .map((item) => {
      const totalItem = item.price != null ? (Number(item.price) * item.quantity).toFixed(2) : "S/C";
      return `${item.quantity}x ${String(item.name).padEnd(20)} ${totalItem}€`;
    })
    .join("\n")}
-------------------------------------
TOTAL: ${money(pedido.total)}€
-------------------------------------
${getObservacoesCliente(pedido) ? `OBS: ${getObservacoesCliente(pedido)}\n` : ""}
=====================================
`;

  try {
    await printTextViaIframe(textoPedido);
  } catch (error) {
    console.error("Erro ao imprimir:", error);
    alert("⚠️ Não foi possível imprimir.");
  }
}



  async function aceitarPedido(pedidoId: string) {
    // ✅ abre a aba ANTES dos awaits (evita popup blocker)
    const waTab = window.open("", "_blank");

    try {
      const pedido = (pedidos.find((p) => p.id === pedidoId) as unknown as RawPedidoData) || null;
      if (!pedido) return;

      const horaFinal = (horaById[pedidoId] || getHoraSolicitada(pedido) || "").trim();
      const obs = (obsById[pedidoId] || "").trim();

      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "accepted" as PedidoStatus,
          hora_confirmada: horaFinal || null,
          observacoes_admin: obs || null,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", pedidoId);

      if (error) throw error;

      // ✅ UI instantânea
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId
            ? ({ ...p, status: "accepted", hora_confirmada: horaFinal || null, observacoes_admin: obs || null } as Pedido)
            : p
        )
      );

      // ✅ monta URL do WhatsApp e joga na aba pré-aberta
      const waUrl = buildWhatsAppUrl(pedidoId, "accepted");
      if (waTab && waUrl) waTab.location.href = waUrl;
      if (!waTab && waUrl) window.open(waUrl, "_blank");

      // ✅ imprime depois (não rouba o popup do WhatsApp)
      await enviarParaImpressora(pedidoId);

      // limpa só daquele pedido
      setHoraById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
      setObsById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
    } catch (error) {
      console.error("Erro ao aceitar pedido:", error);
      alert("❌ Erro ao aceitar pedido");
      // se abriu aba vazia e deu erro, fecha
      try { waTab?.close(); } catch { /* ignore close error */ }
    }
  }


  async function rejeitarPedido(pedidoId: string) {
    const obs = (obsById[pedidoId] || "").trim();
    if (!obs) {
      alert("Por favor, informe o motivo da rejeição");
      return;
    }

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "rejected" as PedidoStatus,
          observacoes_admin: obs,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", pedidoId);

      if (error) throw error;

      // ✅ UI instantânea
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? ({ ...p, status: "rejected", observacoes_admin: obs } as Pedido) : p
        )
      );

      // ✅ WhatsApp pro cliente com motivo
      const whatsappUrl = buildWhatsAppUrl(pedidoId, "rejected", obs);
      if (whatsappUrl) window.open(whatsappUrl, "_blank");

      setObsById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
      setHoraById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
    } catch (error) {
      console.error("Erro ao rejeitar pedido:", error);
      alert("❌ Erro ao rejeitar pedido");
    }
  }

  async function editarPedido(pedidoId: string) {
    const motivo = (obsById[pedidoId] || "").trim();
    if (!motivo) {
      alert("Para editar, informe o motivo da alteração.");
      return;
    }

    const pedido = (pedidos.find((p) => p.id === pedidoId) as unknown as RawPedidoData) || null;
    if (!pedido) return;

    const horaFinal = (
      horaById[pedidoId] ||
      getHoraConfirmada(pedido) ||
      getHoraSolicitada(pedido) ||
      ""
    ).trim();

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          hora_confirmada: horaFinal || null,
          observacoes_admin: motivo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pedidoId);

      if (error) throw error;

      // ✅ UI instantânea
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? ({ ...p, hora_confirmada: horaFinal || null, observacoes_admin: motivo } as Pedido) : p
        )
      );

      // ✅ imprime versão ajustada também (opcional)
      await enviarParaImpressora(pedidoId);

      // ✅ WhatsApp pro cliente avisando ajuste
      const whatsappUrl = buildWhatsAppUrl(pedidoId, "edited", motivo);
      if (whatsappUrl) window.open(whatsappUrl, "_blank");

      setObsById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
      setHoraById((prev) => {
        const copy = { ...prev };
        delete copy[pedidoId];
        return copy;
      });
    } catch (error) {
      console.error("Erro ao editar pedido:", error);
      alert("❌ Erro ao editar pedido");
    }
  }

  // =========================
  // Seções
  // =========================
  const pendentes = useMemo(() => pedidos.filter((p) => p.status === "pending"), [pedidos]);
  const aceitos = useMemo(
    () => pedidos.filter((p) => p.status === "accepted" || p.status === "preparing"),
    [pedidos]
  );
  const rejeitados = useMemo(() => pedidos.filter((p) => p.status === "rejected"), [pedidos]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display text-gradient-fire">GESTÃO DE PEDIDOS</h1>
            <p className="text-sm text-muted-foreground">
              {rtConnected ? "🟢 Real-time conectado" : "🟠 Real-time instável (fallback ativo)"} •
              Data: <span className="font-medium">{dataFiltro}</span>
              {lastRefreshAt ? (
                <span className="ml-2 opacity-70">
                  • Última atualização: {new Date(lastRefreshAt).toLocaleTimeString("pt-PT")}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button
              type="button"
              variant={deliveryEnabled ? "secondary" : "destructive"}
              onClick={toggleDelivery}
              disabled={settingsLoading}
              className="gap-2"
            >
              {deliveryEnabled ? "🚚 Entregas ATIVAS" : "🚫 Entregas DESATIVADAS"}
            </Button>
          </div>

          <Button variant="secondary" type="button" onClick={() => setMenuOpen(true)} className="gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            Menu / Pratos do Dia
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 opacity-70" />
              <Input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-[170px]"
              />
              <Button
                variant="secondary"
                onClick={() => carregarPedidos(dataFiltro)}
                disabled={loading}
                className="gap-2"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>

            <Button
              variant="destructive"
              onClick={() => {
                sair();
                navigate("/login", { replace: true });
              }}
              className="gap-2"
              type="button"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Pendentes */}
          <section className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Pendentes</h2>
              <span className="text-sm px-2 py-1 rounded-full bg-accent text-accent-foreground">
                {pendentes.length}
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : pendentes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum pedido pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendentes.map((pedido) => {
                  const p = pedido as unknown as RawPedidoData;
                  const itens = getItens(p);

                  return (
                    <div key={pedido.id} className="rounded-xl border-2 border-primary p-4 animate-pulse-glow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold">#{pedido.id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(pedido.created_at).toLocaleString("pt-PT")}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary text-primary-foreground">
                          NOVO
                        </span>
                      </div>

                      <div className="text-sm space-y-1 mb-3">
                        <p>
                          <strong>Cliente:</strong> {getClienteNome(p)}
                        </p>
                        <p>
                          <strong>Endereço:</strong> {getEndereco(p)}
                        </p>
                        <p>
                          <strong>Hora:</strong> {getHoraSolicitada(p)}
                        </p>
                        <p>
                          <strong>Tipo:</strong> {getTipoEntrega(p) === "delivery" ? "Entrega" : "Recolha"}
                        </p>
                      </div>

                      <div className="mb-3">
                        <strong className="block mb-2 text-sm">Itens:</strong>

                        {itens.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sem itens.</div>
                        ) : (
                          <div className="space-y-1">
                            {itens.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-semibold">
                                  {item.price != null
                                    ? `${(Number(item.price) * item.quantity).toFixed(2)}€`
                                    : "S/C"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span className="text-primary">{money((pedido as RawPedidoData).total)}€</span>
                        </div>
                      </div>

                      {getObservacoesCliente(p) && (
                        <div className="mb-3 p-3 bg-muted rounded-lg">
                          <strong className="text-sm">Obs do cliente:</strong>
                          <p className="text-sm">{getObservacoesCliente(p)}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Input
                          type="time"
                          value={horaById[pedido.id] ?? ""}
                          onChange={(e) => setHoraById((prev) => ({ ...prev, [pedido.id]: e.target.value }))}
                        />

                        <Textarea
                          placeholder="Obs do restaurante (opcional) / motivo da rejeição"
                          value={obsById[pedido.id] ?? ""}
                          onChange={(e) => setObsById((prev) => ({ ...prev, [pedido.id]: e.target.value }))}
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => aceitarPedido(pedido.id)}
                            type="button"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Aceitar
                          </Button>

                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => rejeitarPedido(pedido.id)}
                            type="button"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Aceitos / Preparo */}
          <section className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Aceitos / Em preparo</h2>
              <span className="text-sm px-2 py-1 rounded-full bg-accent text-accent-foreground">
                {aceitos.length}
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : aceitos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum pedido aceito</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
                {aceitos.map((pedido) => {
                  const p = pedido as unknown as RawPedidoData;
                  return (
                    <div key={pedido.id} className="bg-card p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">#{pedido.id.slice(0, 8)}</span>
                        <span className="text-sm text-muted-foreground">
                          {getHoraConfirmada(p) || getHoraSolicitada(p)}
                        </span>
                      </div>

                      <p className="text-sm">{getClienteNome(p)}</p>
                      <p className="text-lg font-bold text-primary">{money((pedido as RawPedidoData).total)}€</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pedido.created_at).toLocaleString("pt-PT")}
                      </p>

                      {/* Editar hora + motivo */}
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        <Input
                          type="time"
                          value={horaById[pedido.id] ?? ""}
                          onChange={(e) => setHoraById((prev) => ({ ...prev, [pedido.id]: e.target.value }))}
                          placeholder="Nova hora"
                        />
                        <Textarea
                          value={obsById[pedido.id] ?? ""}
                          onChange={(e) => setObsById((prev) => ({ ...prev, [pedido.id]: e.target.value }))}
                          placeholder="Motivo da alteração (obrigatório)"
                          rows={2}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="gap-2"
                          onClick={() => editarPedido(pedido.id)}
                        >
                          <Pencil className="w-4 h-4" />
                          Editar e notificar cliente
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Rejeitados */}
          <section className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Rejeitados</h2>
              <span className="text-sm px-2 py-1 rounded-full bg-accent text-accent-foreground">
                {rejeitados.length}
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : rejeitados.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum pedido rejeitado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rejeitados.map((pedido) => {
                  const p = pedido as unknown as RawPedidoData;
                  return (
                    <div key={pedido.id} className="bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">#{pedido.id.slice(0, 8)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(pedido.created_at).toLocaleString("pt-PT")}
                        </span>
                      </div>
                      <p className="text-sm">{getClienteNome(p)}</p>
                      {getObservacoesAdmin(p) && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Motivo:</strong> {getObservacoesAdmin(p)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <DailyMenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
