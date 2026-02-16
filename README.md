# 🍖 ACAPULCO Take Away

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

Website oficial do restaurante **ACAPULCO** (Viseu, Portugal) — especializado em grelhados, mariscadas e comida tradicional portuguesa.

> 🧠 Projeto real desenvolvido para resolver o fluxo completo de pedidos do restaurante:  
> cliente → sistema → painel admin → confirmação → impressão térmica

---

## 🌐 Demo

🔗 **Acesse o sistema:**  
👉 https://acapulco.vercel.app

📹 Fluxo implementado:

- Pedido pelo cliente  
- Recebimento no painel admin  
- Aceitação do pedido  
- Geração de canhoto para impressora térmica  
- Integração com WhatsApp  

---

## 🚀 Tech Stack

- **Frontend:** React 18 + TypeScript  
- **Build:** Vite 5  
- **Styling:** Tailwind CSS 3  
- **UI:** shadcn/ui  
- **Routing:** React Router DOM 6  
- **State:** React Context API  
- **Forms:** React Hook Form  
- **Backend:** Supabase  

---

## ✨ Features

- ✅ Design responsivo (mobile-first)
- ✅ Dark mode
- ✅ UI moderna com animações suaves
- ✅ Navegação completa
- ✅ Integração com WhatsApp Business
- ✅ SEO básico otimizado
- ✅ Sistema de pedidos com carrinho
- ✅ Painel administrativo
- ✅ Integração com Supabase
- ✅ Fluxo completo de pedidos
- ✅ Canhoto para impressora térmica
- ✅ Menu de extras (acompanhamentos, bebidas e sobremesas)

---

## 📱 Roadmap

- [x] Landing page
- [x] Sistema de navegação
- [x] Páginas estáticas (Menu, Sobre, Contactos)
- [x] Integração com Supabase
- [x] Sistema de pedidos com carrinho
- [x] Painel administrativo
- [x] Sistema de autenticação
- [ ] Upload de imagens
- [ ] PWA
- [ ] Aplicativo mobile (futuro)

---

### 🔧 Setup

```bash
# Clone o repositório
git clone https://github.com/manoel-gosalan/Acapulco.git
cd Acapulco

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev

```
🔐 Variáveis de Ambiente

Crie um arquivo .env.local baseado no .env.example:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WHATSAPP_NUMBER=

🗂️ Estrutura do Projeto
src/
├── assets/          # Imagens e recursos estáticos
├── components/
│   ├── layout/      # Header, Footer, Layout
│   └── ui/          # Componentes base (shadcn/ui)
├── contexts/        # React Contexts (Cart, etc)
├── lib/             # Utilitários e helpers
├── services/        # Integrações (Supabase, APIs)
├── pages/           # Páginas da aplicação
├── App.tsx          # Componente raiz
├── main.tsx         # Entry point
└── index.css        # Estilos globais



## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

**ACAPULCO Take Away**
- 📍 Av. Capitão Silva Pereira 53, Viseu
- 📞 232 421 996
- 💬 WhatsApp Business 

---

Desenvolvido com ❤️ e 🔥 por [Manoel Gosalan](https://github.com/manoel-gosalan)
