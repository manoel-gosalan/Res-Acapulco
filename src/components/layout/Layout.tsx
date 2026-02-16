import { Header } from './Header';
import { Footer } from './Footer';
import React from "react";
// aqui para o footer responsivo de ligacao e whatsapp fazer importacao

interface LayoutProps {
  children: React.ReactNode;
  showFloatingCTA?: boolean;
}

export function Layout({ children = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />

    </div>
  );
}
