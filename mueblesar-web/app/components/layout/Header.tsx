"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { Search, ShoppingCart, User, Menu, X, Sofa } from "lucide-react";

const nav = [
  { href: "/productos", label: "Catálogo" },
  { href: "/mueblerias", label: "Mueblerías" },
  { href: "/productos?ofertas=true", label: "Ofertas" },
  { href: "/contacto", label: "Contacto" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const lastScrollY = useRef(0);
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsAtTop(currentScrollY < 10);
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/productos?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 ease-in-out
          ${isVisible ? "translate-y-0" : "-translate-y-full"}
          ${!isAtTop ? "shadow-md" : ""}
        `}
      >
        {/* Main Header */}
        <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-4 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#1d4ed8] text-white">
                <Sofa className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </span>
              <span className="text-xl sm:text-2xl font-extrabold leading-none text-[#0f172a] tracking-tight">AMOBLY</span>
            </Link>

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-[520px] mx-4">
              <div className="w-full relative">
                <div className="flex items-center rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-sm focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#1d4ed8]/20 transition-all">
                  <Search className="w-4 h-4 text-[#94a3b8] mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar muebles..."
                    className="w-full border-none bg-transparent text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Cart */}
              <Link
                href="/carrito"
                className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-[#334155] transition-colors hover:bg-[#e2e8f0]"
                aria-label="Ir al carrito"
              >
                <ShoppingCart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#2563eb] text-[9px] sm:text-[10px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Mi Cuenta - Desktop */}
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-3 sm:px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e40af] active:scale-95"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Mi Cuenta</span>
              </Link>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#334155] hover:bg-[#e2e8f0] rounded-lg transition-colors active:scale-95"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Search - Below header on mobile */}
          <form onSubmit={handleSearch} className="pb-3 md:hidden">
            <div className="flex items-center rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 shadow-sm focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#1d4ed8]/20 transition-all">
              <Search className="w-4 h-4 text-[#94a3b8] mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar muebles..."
                className="w-full border-none bg-transparent text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </form>
        </div>

        {/* Desktop Navigation Bar */}
        <div className="hidden lg:block border-t border-[#e2e8f0] bg-white">
          <div className="mx-auto w-full max-w-[1700px] px-4 lg:px-8">
            <nav className="flex items-center gap-1 py-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-[15px] font-medium text-[#475569] rounded-lg transition-colors hover:text-[#1d4ed8] hover:bg-[#f1f5f9]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[104px] md:h-[132px] lg:h-[118px]" />

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="absolute right-0 top-0 h-full w-[280px] sm:w-80 bg-white shadow-2xl transform transition-transform">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3">
              <span className="text-lg font-bold text-[#0f172a]">Menú</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-col p-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-[15px] font-medium text-[#334155] rounded-lg hover:bg-[#f1f5f9] hover:text-[#1d4ed8] transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              <hr className="my-2 border-[#e2e8f0]" />

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-[#334155] rounded-lg hover:bg-[#f1f5f9] hover:text-[#1d4ed8] transition-colors"
              >
                <User className="w-5 h-5 text-[#2563eb]" />
                Mi cuenta
              </Link>

              <Link
                href="/carrito"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-[15px] font-medium text-[#334155] rounded-lg hover:bg-[#f1f5f9] hover:text-[#1d4ed8] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5" />
                  Carrito
                </span>
                {cartCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
