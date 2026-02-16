import { MessageCircle, Flame, Truck, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { openWhatsApp } from '@/lib/whatsapp';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-grelhados.jpg';
import grelhadoMistoImage from '@/assets/grelhado-misto.jpg';

const valores = [
  {
    icon: Flame,
    title: 'Grelha a Carvão',
    description: 'Os nossos grelhados são preparados na tradicional grelha a carvão de azinho, garantindo o sabor autêntico e a carne suculenta que nos caracteriza.',
  },
  {
    icon: Award,
    title: 'Ingredientes Frescos',
    description: 'Trabalhamos diariamente com produtos frescos e de qualidade. Carnes selecionadas, peixe do dia e legumes da região.',
  },
  {
    icon: Clock,
    title: 'Rapidez no Serviço',
    description: 'Sabemos que o tempo é precioso. Por isso, preparamos os pedidos com a máxima eficiência sem comprometer a qualidade.',
  },
  {
    icon: Truck,
    title: 'Entregas Próprias',
    description: 'A nossa equipa de entregas garante que a sua refeição chega quentinha e no tempo certo, em qualquer ponto de Viseu.',
  },
];

export default function Sobre() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-dark" />
        
        <div className="container-narrow relative z-10 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-display text-gradient-fire mb-6">
              SOBRE O ACAPULCO
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Há anos a servir Viseu com o melhor da gastronomia tradicional portuguesa. 
              Grelhados, marisco e comida caseira, sempre com a qualidade que merece.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="container-narrow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display text-foreground mb-6">
                A NOSSA HISTÓRIA
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O ACAPULCO nasceu da paixão pela boa comida e pelo desejo de levar aos viseense
                  o melhor da gastronomia tradicional portuguesa. Começámos como uma pequena churrasqueira 
                  e, ao longo dos anos, conquistámos o coração de famílias inteiras.
                </p>
                <p>
                  A nossa cozinha é o nosso orgulho. Aqui, cada prato é preparado com dedicação, 
                  usando técnicas tradicionais e ingredientes de primeira qualidade. A grelha a carvão 
                  é o coração do nosso restaurante, onde as carnes ganham aquele sabor inconfundível 
                  que tanto nos caracteriza.
                </p>
                <p>
                  Hoje, além do serviço de take away, oferecemos entregas próprias para toda o
                  Viseu e arredores. Porque acreditamos que uma boa refeição deve chegar a todos,
                  onde quer que estejam.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-glow">
                <img
                  src={grelhadoMistoImage}
                  alt="Grelhados ACAPULCO"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl border border-border shadow-lg">
                <p className="text-3xl font-display text-gradient-fire">+30</p>
                <p className="text-sm text-muted-foreground">Anos de experiência</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-card">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display text-gradient-fire mb-4">
              O QUE NOS DISTINGUE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {valores.map((valor) => (
              <div key={valor.title} className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-fire rounded-xl flex items-center justify-center flex-shrink-0">
                  <valor.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-display text-foreground mb-2">{valor.title}</h3>
                  <p className="text-muted-foreground text-sm">{valor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="section-padding">
        <div className="container-narrow">
          <div className="bg-gradient-dark rounded-2xl border border-border p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-display text-gradient-fire mb-6">
              A NOSSA PROMESSA
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Cada refeição que sai da nossa cozinha é preparada como se fosse para a nossa própria família. 
              Ingredientes frescos, receitas autênticas e todo o cuidado que você merece.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/pratos-do-dia">
                <Button variant="hero" size="xl">
                  Ver Menu
                </Button>
              </Link>
              <Button variant="whatsapp" size="xl" onClick={() => openWhatsApp()}>
                <MessageCircle className="w-5 h-5" />
                Fazer Pedido
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Highlight */}
      <section className="section-padding bg-card">
        <div className="container-narrow">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-gradient-fire rounded-full flex items-center justify-center shadow-glow flex-shrink-0">
              <Truck className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-display text-foreground mb-2">
                ENTREGAS PRÓPRIAS EM VISEU
              </h3>
              <p className="text-muted-foreground">
                Não dependemos de terceiros. A nossa equipa entrega o seu pedido diretamente, 
                garantindo que chega quentinho e com todo o cuidado.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
