import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

/**
 * Uma "linha" do carrinho.
 * IMPORTANT:
 * - lineId é o ID único da linha (permite o mesmo prato em duplicado com escolhas diferentes)
 * - productId é o id do produto/prato no teu banco
 * - note é a nota AUTOMÁTICA daquele item (acompanhamentos/extras)
 */
export type CartItem = {
  id: string;
  lineId: string;
  productId: string;
  name: string;
  price?: number;
  quantity: number;
  note?: string | null;
};

type AddItemInput = {
  productId: string;
  name: string;
  price?: number;
  quantity?: number;
  note?: string | null;

  /**
   * Se você estiver "editando" um item existente,
   * passe lineId aqui para substituir em vez de criar uma linha nova.
   */
  replaceLineId?: string;
};

type CartContextType = {
  // items
  items: CartItem[];
  addItem: (item: AddItemInput) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;

  // drawer state
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setShowCart: (show: boolean) => void;

  // totals
  totalItems: number;
  totalPrice: number;

  // customer notes (manual)
  customerNotes: string;
  setCustomerNotes: (v: string) => void;

  // final observations (derived)
  finalObservations: string;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function uid() {
  // browser moderno: uuid seguro e simples
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // fallback simples
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildAutoNotes(items: CartItem[]) {
  return items
    .map((it) => (it.note ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Observações manuais do cliente
  const [customerNotes, setCustomerNotes] = useState("");

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);
  const setShowCart = useCallback((show: boolean) => setIsOpen(!!show), []);

  /**
   * addItem:
   * - se replaceLineId vier, substitui aquela linha
   * - caso contrário cria uma nova linha SEM misturar com outras
   */
  const addItem = useCallback((input: AddItemInput) => {
    const quantity = input.quantity ?? 1;

    setItems((prev) => {
      if (input.replaceLineId) {
        return prev.map((x) =>
          x.lineId === input.replaceLineId
            ? {
                ...x,
                productId: input.productId,
                name: input.name,
                price: input.price,
                quantity,
                note: input.note ?? null,
              }
            : x
        );
      }

      const line: CartItem = {
        lineId: uid(),
        productId: input.productId,
        name: input.name,
        price: input.price,
        quantity,
        note: input.note ?? null,
      };

      return [...prev, line];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((x) => x.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((x) => x.lineId !== lineId);
      return prev.map((x) => (x.lineId === lineId ? { ...x, quantity } : x));
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerNotes("");
    setIsOpen(false);
  }, []);

  const totalItems = useMemo(() => items.reduce((acc, it) => acc + it.quantity, 0), [items]);

  const totalPrice = useMemo(
    () => items.reduce((acc, it) => acc + (it.price ?? 0) * it.quantity, 0),
    [items]
  );

  /**
   * finalObservations = manual + auto dos itens
   * (e NUNCA mais acumula errado, porque auto vem dos items atuais)
   */
  const finalObservations = useMemo(() => {
    const manual = (customerNotes ?? "").trim();
    const auto = buildAutoNotes(items);

    if (manual && auto) return `${manual}\n\n---\n${auto}`;
    return manual || auto || "";
  }, [customerNotes, items]);

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,

    isOpen,
    openCart,
    closeCart,
    toggleCart,
    setShowCart,

    totalItems,
    totalPrice,

    customerNotes,
    setCustomerNotes,

    finalObservations,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
