import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { openWhatsApp, callPhone, PHONE_NUMBER } from '@/lib/whatsapp';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pb-32 lg:pb-8">
      <div className="container-narrow section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display text-gradient-fire mb-4">ACAPULCO</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Take Away em Viseu. Grelhados, comida tradicional e especialidades do mar com entrega ao domicílio.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Menu</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pratos-do-dia" className="hover:text-primary transition-colors">Ver Menu Completo</Link></li>
              <li><Link to="/especialidades" className="hover:text-primary transition-colors">Especialidades</Link></li>
              <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <button onClick={callPhone} className="hover:text-primary transition-colors">
                  {PHONE_NUMBER}
                </button>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <button onClick={() => openWhatsApp()} className="hover:text-primary transition-colors">
                  WhatsApp
                </button>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>Av. Capitão Silva Pereira 53, Viseu</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Horário</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p>Seg, Ter, Qui, Sex, Sáb</p>
                  <p>11:00 - 14:00 | 18:00 - 21:00</p>
                </div>
              </li>
              <li className="pl-6">
                <p>Domingo: 11:00 - 14:00</p>
              </li>
              <li className="pl-6">
                <p className="text-primary">Quarta: Encerrado</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ACAPULCO Take Away. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
