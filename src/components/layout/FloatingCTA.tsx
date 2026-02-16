import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWhatsApp, callPhone } from '@/lib/whatsapp';

export function FloatingCTA() {
  return (
    <div className="floating-cta lg:hidden">
      <div className="flex gap-3">
        <Button
          variant="call"
          size="lg"
          className="flex-1"
          onClick={callPhone}
        >
          <Phone className="w-5 h-5" />
          Ligar
        </Button>
        <Button
          variant="whatsapp"
          size="lg"
          className="flex-1"
          onClick={() => openWhatsApp()}
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
