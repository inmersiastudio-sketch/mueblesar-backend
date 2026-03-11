"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";
import { SearchBar } from "../ui/SearchBar";
import { useCart } from "../../context/CartContext";

const nav = [
  { href: "/productos", label: "Productos" },
  { href: "/mueblerias", label: "Mueblerías" },
  { href: "/ar", label: "AR Experience" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_2px_16px_0_rgba(0,88,163,0.08)]">
        {/* Main Header Row */}
        <Container>
          <div className="flex h-16 items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/icono_azul.png"
                alt="Amobly"
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl">
              <div className="w-full relative">
                <SearchBar />
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Login/Account for Stores */}
              <Link
                href="/login"
                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                title="Acceso exclusivo para mueblerías"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <span>Acceso Mueblerías</span>
              </Link>

              {/* Favorites */}
              <Link
                href="/favoritos"
                className="p-2.5 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Favoritos"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </Link>

              {/* Cart */}
              <Link
                href="/carrito"
                className="relative p-2.5 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Carrito"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2.5 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Abrir menú"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile Search Bar */}
        <div className="border-t border-gray-100 px-4 py-3 md:hidden bg-white">
          <SearchBar />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-lg font-bold text-gray-900">Menú</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Cerrar menú"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col p-4 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              <hr className="my-3 border-gray-100" />

              <Link
                href="/favoritos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                Favoritos
              </Link>

              <Link
                href="/carrito"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Carrito
                </span>
                {cartCount > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>

              <hr className="my-3 border-gray-100" />

              <Link
                href="/registrar"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-base font-bold text-white bg-primary hover:bg-primary-600 rounded-xl transition-colors text-center"
              >
                Vender en Amobly
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
