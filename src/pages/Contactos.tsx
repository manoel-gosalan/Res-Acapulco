import { useState } from 'react';
import { Phone, MessageCircle, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/layout/Layout';
import { openWhatsApp, callPhone, PHONE_NUMBER } from '@/lib/whatsapp';

export default function Contactos() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to a backend
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', phone: '', message: '' });
    }, 3000);
  };

  const horario = [
    { dia: 'Segunda-feira', horas: '11:00 - 14:00 | 18:00 - 21:00' },
    { dia: 'Terça-feira', horas: '11:00 - 14:00 | 18:00 - 21:00' },
    { dia: 'Quarta-feira', horas: 'Encerrado', closed: true },
    { dia: 'Quinta-feira', horas: '11:00 - 14:00 | 18:00 - 21:00' },
    { dia: 'Sexta-feira', horas: '11:00 - 14:00 | 18:00 - 21:00' },
    { dia: 'Sábado', horas: '11:00 - 14:00 | 18:00 - 21:00' },
    { dia: 'Domingo', horas: '11:00 - 14:00' },
  ];

  return (
    <Layout>
      <div className="container-narrow section-padding">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display text-gradient-fire mb-4">
            CONTACTOS
          </h1>
          <p className="text-muted-foreground">
            Estamos aqui para si. Faça já a sua encomenda!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-2xl font-display text-foreground mb-4">ENCOMENDAR</h2>
              <div className="space-y-3">
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="w-full justify-start"
                  onClick={() => openWhatsApp()}
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp - Fazer Pedido
                </Button>
                <Button
                  variant="call"
                  size="lg"
                  className="w-full justify-start"
                  onClick={callPhone}
                >
                  <Phone className="w-5 h-5" />
                  Ligar: {PHONE_NUMBER}
                </Button>
              </div>
            </div>

            {/* Address */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-2xl font-display text-foreground mb-4">MORADA</h2>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-foreground">Avenida Capitão Silva Pereira 53</p>
                  <p className="text-foreground">3500-000 Viseu</p>
                  <p className="text-muted-foreground text-sm mt-2">Portugal</p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-2xl font-display text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                HORÁRIO
              </h2>
              <div className="space-y-2">
                {horario.map((item) => (
                  <div
                    key={item.dia}
                    className={`flex justify-between text-sm ${
                      item.closed ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <span>{item.dia}</span>
                    <span className={item.closed ? 'font-semibold' : 'text-muted-foreground'}>
                      {item.horas}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-gradient-dark rounded-xl border border-border p-6">
              <h2 className="text-2xl font-display text-gradient-fire mb-4">ENTREGAS</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Zona de entrega</span>
                  <span className="text-foreground">Viseu e arredores</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="text-foreground">3.85€ + 0.15€ (saco)</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Tempo estimado</span>
                  <span className="text-foreground">30-45 minutos</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Map & Form */}
          <div className="space-y-8">
            {/* Map */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3021.123456789!2d-7.913!3d40.657!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zVmlzZXU!5e0!3m2!1sen!2spt!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização ACAPULCO Take Away"
                />
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-2xl font-display text-foreground mb-4">ENVIAR MENSAGEM</h2>
              
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-foreground font-semibold">Mensagem enviada!</p>
                  <p className="text-muted-foreground text-sm">Entraremos em contacto brevemente.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                    <Input
                      placeholder="O seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                    <Input
                      type="tel"
                      placeholder="O seu telefone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Mensagem</label>
                    <Textarea
                      placeholder="A sua mensagem..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" variant="fire" size="lg" className="w-full">
                    <Send className="w-5 h-5" />
                    Enviar Mensagem
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
