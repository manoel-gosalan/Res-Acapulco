import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu as MenuIcon, X, Phone, ShoppingBag, Lock, User, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { callPhone } from "@/lib/whatsapp";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/pratos-do-dia", label: "Pratos do Dia" },
  { href: "/especialidades", label: "Especialidades" },
  { href: "/contactos", label: "Contactos" },
  { href: "/sobre", label: "Sobre Nós" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const { totalItems, isOpen: showCart, setShowCart } = useCart();
  const { user } = useAuth();
  const { isAdmin } = useAdmin(); // ✅ Admin só se role=admin

  const isLoggedIn = !!user;

  function closeMobileMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container-narrow">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <span className="text-2xl font-display text-gradient-fire tracking-wide">
                ACAPULCO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.href ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="call" size="sm" onClick={callPhone}>
                <Phone className="w-4 h-4" />
                Ligar
              </Button>

              <Button
                variant="fire"
                size="sm"
                className="relative"
                onClick={() => setShowCart(true)}
                type="button"
              >
                <ShoppingBag className="w-4 h-4" />
                Encomendar
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>

              {/* Auth buttons */}
              {!isLoggedIn ? (
                <>
                  <Link to="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Lock className="w-4 h-4" />
                      Login
                    </Button>
                  </Link>

                  <Link to="/registro">
                    <Button variant="outline" size="sm">
                      <UserPlus className="w-4 h-4" />
                      Criar conta
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/account">
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4" />
                      Minha conta
                    </Button>
                  </Link>

                  {isAdmin && (
                    <Link to="/admin/pedidos">
                      <Button variant="outline" size="sm">
                        <Lock className="w-4 h-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile buttons */}
            <div className="flex lg:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="relative"
                onClick={() => {
                  closeMobileMenu();
                  setShowCart(true);
                }}
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>


              <button
                onClick={() => setIsOpen((v) => !v)}
                className="p-2 text-foreground"
                aria-label="Menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <nav className="lg:hidden border-t border-border bg-background animate-fade-up">
              <div className="py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`block px-4 py-3 text-base font-medium transition-colors ${location.pathname === link.href
                      ? "text-primary bg-muted"
                      : "text-foreground hover:bg-muted"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="border-t border-border mt-2 pt-2">
                  {!isLoggedIn ? (
                    <>
                      <Link
                        to="/login"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Lock className="w-4 h-4" />
                        Login
                      </Link>

                      <Link
                        to="/registro"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                      >
                        <UserPlus className="w-4 h-4" />
                        Criar conta
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/account"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                      >
                        <User className="w-4 h-4" />
                        Minha conta
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin/pedidos"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-2 px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                        >
                          <Lock className="w-4 h-4" />
                          Admin
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      {showCart && <CartDrawer onClose={() => setShowCart(false)} />}
    </>
  );
}
