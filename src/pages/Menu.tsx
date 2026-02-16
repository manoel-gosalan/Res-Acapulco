/**
 * ⚠️ LEGACY / FUTURO USO
 * Esta página será migrada para consumir menu_items do banco.
 * Atualmente o fluxo principal usa PratosDoDia.
 */



import { useState } from "react";
import { Phone, ShoppingBag, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { callPhone } from "@/lib/whatsapp"; // por enquanto ainda existe CTA de ligar
import terraMarImage from "@/assets/terra-mar.jpg";
import grelhadoMistoImage from "@/assets/grelhado-misto.jpg";

const menuCategories = [
  { id: "pratos-do-dia", name: "Pratos do Dia" },
  { id: "peixe", name: "Peixe" },
  { id: "carne", name: "Carne" },
  { id: "grelhados", name: "Grelhados" },
  { id: "pizzas", name: "Pizzas" },
  { id: "entradas", name: "Entradas" },
  { id: "sobremesas", name: "Sobremesas" },
  { id: "bebidas", name: "Bebidas" },
];

const menuItems = [
  { id: "prato-dia-carne", name: "Prato do Dia - Carne", description: "Consulte o prato do dia", category: "pratos-do-dia", price: 7.5, image: grelhadoMistoImage },
  { id: "prato-dia-peixe", name: "Prato do Dia - Peixe", description: "Consulte o prato do dia", category: "pratos-do-dia", price: 8.0, image: null },

  { id: "bacalhau-braga", name: "Bacalhau à Braga", description: "Com batata a murro e grelos", category: "peixe", price: 14.5, image: null },
  { id: "polvo-lagareiro", name: "Polvo à Lagareiro", description: "Polvo grelhado com azeite e alho", category: "peixe", price: 18.0, image: null },
  { id: "dourada-grelhada", name: "Dourada Grelhada", description: "Com legumes salteados", category: "peixe", price: 13.0, image: null },

  { id: "bife-vitela", name: "Bife de Vitela", description: "Com molho à escolha", category: "carne", price: 14.0, image: null },
  { id: "secretos-porco", name: "Secretos de Porco Preto", description: "Grelhados na brasa", category: "carne", price: 13.5, image: null },
  { id: "frango-churrasco", name: "Frango no Churrasco", description: "1/2 frango com batata frita", category: "carne", price: 9.0, image: null },

  { id: "grelhado-misto", name: "Grelhado Misto Especial", description: "Costela, entrecosto, febras, chouriço", category: "grelhados", price: null, image: grelhadoMistoImage },
  { id: "terra-mar", name: "Terra Mar", description: "Camarão, lagosta e carne grelhada", category: "grelhados", price: null, image: terraMarImage },
  { id: "picanha", name: "Picanha Grelhada", description: "Com arroz e feijão preto", category: "grelhados", price: 16.0, image: null },
  { id: "costelas", name: "Costelas de Porco", description: "Com molho BBQ caseiro", category: "grelhados", price: 12.0, image: null },

  { id: "pizza-margherita", name: "Pizza Margherita", description: "Tomate, mozzarella, manjericão", category: "pizzas", price: 8.0, image: null },
  { id: "pizza-pepperoni", name: "Pizza Pepperoni", description: "Pepperoni, mozzarella, oregãos", category: "pizzas", price: 9.5, image: null },
  { id: "pizza-mista", name: "Pizza Mista", description: "Fiambre, cogumelos, queijo", category: "pizzas", price: 9.0, image: null },
  { id: "pizza-atum", name: "Pizza Atum", description: "Atum, cebola, azeitonas", category: "pizzas", price: 9.5, image: null },

  { id: "chourico-assado", name: "Chouriço Assado", description: "Chouriço flambado na aguardente", category: "entradas", price: 5.5, image: null },
  { id: "ameijoas-bulhao", name: "Amêijoas à Bulhão Pato", description: "Com coentros e limão", category: "entradas", price: 12.0, image: null },
  { id: "pimentos-padron", name: "Pimentos Padrón", description: "Salteados com sal grosso", category: "entradas", price: 6.0, image: null },

  { id: "pudim-flan", name: "Pudim Flan", description: "Receita tradicional", category: "sobremesas", price: 3.0, image: null },
  { id: "mousse-chocolate", name: "Mousse de Chocolate", description: "Chocolate negro 70%", category: "sobremesas", price: 3.5, image: null },
  { id: "arroz-doce", name: "Arroz Doce", description: "Com canela", category: "sobremesas", price: 2.5, image: null },

  { id: "agua", name: "Água 0.5L", description: "Mineral ou com gás", category: "bebidas", price: 1.0, image: null },
  { id: "refrigerante", name: "Refrigerantes", description: "Coca-Cola, Fanta, Sprite", category: "bebidas", price: 1.5, image: null },
  { id: "cerveja", name: "Cerveja", description: "Super Bock ou Sagres", category: "bebidas", price: 1.5, image: null },
  { id: "vinho-casa", name: "Vinho da Casa", description: "Tinto ou branco (jarro)", category: "bebidas", price: 5.0, image: null },
];

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { items, addItem, updateQuantity, totalItems, setShowCart } = useCart();

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category === activeCategory)
    : menuItems;

  const getItemQuantity = (id: string) => items.find((i) => i.id === id)?.quantity ?? 0;

  return (
    <Layout showFloatingCTA>
      {/* Top Bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container-narrow px-4 py-3">
          <div className="flex gap-3">
            <Button variant="whatsapp" size="sm" className="flex-1" onClick={() => setShowCart(true)}>
              <ShoppingBag className="w-4 h-4" />
              Ver Pedido {totalItems > 0 && `(${totalItems})`}
            </Button>

            <Button variant="call" size="sm" className="flex-1" onClick={callPhone}>
              <Phone className="w-4 h-4" />
              Ligar
            </Button>
          </div>
        </div>
      </div>

      <div className="container-narrow section-padding">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display text-gradient-fire mb-2">MENU</h1>
          <p className="text-muted-foreground">Escolhe os teus pratos favoritos</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <Button variant={activeCategory === null ? "fire" : "secondary"} size="sm" onClick={() => setActiveCategory(null)}>
            Todos
          </Button>
          {menuCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "fire" : "secondary"}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const quantity = getItemQuantity(item.id);

            return (
              <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex gap-4">
                {item.image && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{item.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-primary font-semibold">
                      {item.price != null ? `${item.price.toFixed(2)}€` : "Sob consulta"}
                    </span>

                    {quantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>

                        <span className="w-6 text-center font-semibold">{quantity}</span>

                        <Button
                          variant="fire"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="fire"
                        size="sm"
                        onClick={() => {
                          addItem({id: item.id, name: item.name, price: item.price ?? undefined});
                          setShowCart(true); // UX: adicionou → abre carrinho
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
