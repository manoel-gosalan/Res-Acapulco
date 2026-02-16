import { Phone, MessageCircle, MapPin, Truck, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { openWhatsApp, callPhone, openWhatsAppSimple } from '@/lib/whatsapp';
import { Link, useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-grelhados.jpg';
import terraMarImage from '@/assets/terra-mar.jpg';
import grelhadoMistoImage from '@/assets/grelhado-misto.jpg';
import mariscadaImage from '@/assets/mariscada.jpg';

const highlights = [
  {
    id: 'terra-mar',
    name: 'Terra Mar',
    description: 'O melhor do mar e da terra. Camarão, lagosta e carne grelhada.',
    image: terraMarImage,
    price: 'Sob consulta',
  },
  {
    id: 'grelhado-misto',
    name: 'Grelhado Misto Especial',
    description: 'Costela, entrecosto, febras, chouriço e legumes grelhados.',
    image: grelhadoMistoImage,
    price: 'Sob consulta',
  },
  {
    id: 'mariscada',
    name: 'Mariscadas',
    description: 'Lagosta, camarão, amêijoas, mexilhões e peixe fresco.',
    image: mariscadaImage,
    price: 'Sob consulta',
  },
];

const testimonials = [
  {
    name: 'Carlos M.',
    text: 'Melhor grelhado misto de Viseu! Entrega sempre a tempo e comida quentinha.',
    rating: 5,
  },
  {
    name: 'Ana P.',
    text: 'A mariscada é espetacular. Ingredientes frescos e porções generosas.',
    rating: 5,
  },
  {
    name: 'João S.',
    text: 'Pratos do dia com ótima relação qualidade-preço. Recomendo!',
    rating: 5,
  },
];

export default function Index() {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleAddToOrder = (item: typeof highlights[0]) => {
    addItem({productId: item.id, name: item.name});
  };

  return (
    <Layout>
      {/* Hero Section */}
<section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
  {/* ✅ Background real (sem depender de CSS .hero-bg) */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `url(${heroImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  />

  {/* overlays (mantém teu look) */}
  <div className="absolute inset-0 bg-gradient-hero" />
  <div className="absolute inset-0 bg-background/60" />

  <div className="relative z-10 container-narrow text-center px-4 py-20">
    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display text-gradient-fire mb-4 animate-fade-up">
      ACAPULCO
    </h1>
    <p className="text-l md:text-l font-display tracking-wider text-foreground/90 mb-1">
      TAKE AWAY • COZINHA PORTUGUESA • CHURRASQUEIRA
    </p>
    <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
      Take Away em Viseu • Entregas ao domicílio • Especialidades • Grelhados • Comida tradicional
    </p>

    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <Button
        variant="hero"
        size="xl"
        onClick={() => navigate("/pratos-do-dia")}
        className="animate-pulse-glow"
      >
        <MessageCircle className="w-5 h-5" />
        Fazer Pedido
      </Button>
      <Button variant="heroSecondary" size="xl" onClick={callPhone}>
        <Phone className="w-5 h-5" />
        Ligar Agora
      </Button>
    </div>

    <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-primary" />
        Entregas próprias
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Viseu
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        30-45 min
      </div>
    </div>
  </div>
</section>


      {/* Highlights Section */}
      <section className="section-padding bg-gradient-dark">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display text-gradient-fire mb-4">
              DESTAQUES
            </h2>
            <p className="text-muted-foreground">
              As nossas especialidades mais pedidas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div 
                key={item.id} 
                className="bg-card rounded-xl overflow-hidden card-hover border border-border"
              >
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-display text-foreground mb-2">{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-semibold">{item.price}</span>
                    <Button 
                      variant="fire" 
                      size="sm"
                      onClick={() => handleAddToOrder(item)}
                    >
                      Encomendar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/pratos-do-dia">
              <Button variant="outline" size="lg">
                Ver Menu Completo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    
      {/* How to Order Section 
      <section className="section-padding">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display text-gradient-fire mb-4">
              COMO ENCOMENDAR
            </h2>
            <p className="text-muted-foreground">
              Simples, rápido e delicioso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Escolhe no Menu', desc: 'Navega pelo nosso menu e adiciona os teus pratos favoritos.' },
              { step: '02', title: 'Envia o Pedido', desc: 'Manda-nos mensagem no WhatsApp ou liga para confirmar.' },
              { step: '03', title: 'Entrega em Casa', desc: 'Recebe a tua refeição quentinha, onde estiveres em Viseu.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-fire rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <span className="text-2xl font-display text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="text-xl font-display text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}
      {/* Testimonials Section */}
      <section className="section-padding bg-card">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display text-gradient-fire mb-4">
              O QUE DIZEM DE NÓS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-background p-6 rounded-xl border border-border"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-foreground mb-4">"{testimonial.text}"</p>
                <p className="text-muted-foreground text-sm">— {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Info Section */}
      <section className="section-padding">
        <div className="container-narrow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-display text-gradient-fire mb-4">
                ENTREGAS EM VISEU
              </h2>
              <p className="text-muted-foreground mb-6">
                Entregas próprias para garantir que a tua refeição chega quentinha e no tempo certo.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Zona de entrega: Viseu e arredores</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Tempo médio: 30-45 minutos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <span>Taxa de entrega: consultar</span>
                </li>
              </ul>
            </div>
            <div className="bg-card p-8 rounded-xl border border-border text-center">
              <h3 className="text-2xl font-display text-foreground mb-4">
                QUERO ENCOMENDAR AGORA
              </h3>
              <p className="text-muted-foreground mb-6">
                Faz já o teu pedido e desfruta do melhor take away de Viseu.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full"
                  onClick={() => openWhatsApp()}
                >
                  <MessageCircle className="w-5 h-5" />
                  Fazer Pedido no WhatsApp
                </Button>
                <Button 
                  variant="call" 
                  size="lg" 
                  className="w-full"
                  onClick={callPhone}
                >
                  <Phone className="w-5 h-5" />
                  Ligar: 232 421 996
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
