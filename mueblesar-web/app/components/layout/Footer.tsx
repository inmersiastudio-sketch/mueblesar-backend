import Link from "next/link";
import { Sofa, Globe, AtSign, Share2, MapPin, Phone, Mail } from "lucide-react";
import { Container } from "./Container";

const currentYear = new Date().getFullYear();

const footerLinks = {
  compania: [
    { href: "/mueblerias", label: "Mueblerías Aliadas" },
    { href: "/productos", label: "Catálogo" },
    { href: "/registrar", label: "Vender en Amobly" },
    { href: "/contacto", label: "Contacto" },
  ],
  ayuda: [
    { href: "/productos?arOnly=true", label: "Con realidad aumentada" },
    { href: "/buscar", label: "Buscar productos" },
    { href: "/terminos", label: "Términos y condiciones" },
    { href: "/privacidad", label: "Política de privacidad" },
  ],
};

export function Footer() {
  return (
    <>
      <section className="bg-[#f1f5f9] py-5">
        <Container>
          <div className="rounded-2xl bg-[#e9edf3] px-6 py-6 text-center md:px-10">
            <h4 className="text-lg font-bold text-[#0f172a]">Mueblerías aliadas</h4>
            <p className="mx-auto mt-1.5 max-w-3xl text-sm text-[#475569]">
              Trabajamos con los talleres y estudios de diseño más exclusivos del país para garantizarte piezas de autor.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base font-bold tracking-wide text-[#6b7280] md:gap-x-10">
              <span>ATELIER</span>
              <span>LUXE</span>
              <span>NORDIC</span>
              <span>FABRIK</span>
              <span>NATURA</span>
              <Link href="/mueblerias" className="text-[#2563eb] transition-colors hover:text-[#1d4ed8]">
                Ver todas
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-[#11213d] bg-[#07142e] text-white">
        <Container>
          <div className="grid grid-cols-1 gap-10 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Columna 1 — Marca */}
            <div className="flex flex-col gap-3.5">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2563eb] text-white">
                  <Sofa className="h-3 w-3" />
                </span>
                <span className="text-lg font-bold tracking-tight">AMOBLY</span>
              </Link>
              <p className="text-xs leading-relaxed text-[#9aa8c3]">
                Redefiniendo el diseño de interiores con piezas exclusivas que combinan funcionalidad, estética y calidad superior.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href="https://instagram.com/amobly.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#132645] text-[#94a3b8] transition-colors hover:bg-[#1b3763] hover:text-white"
                  aria-label="Instagram"
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
                <a
                  href="mailto:hola@amobly.com"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#132645] text-[#94a3b8] transition-colors hover:bg-[#1b3763] hover:text-white"
                  aria-label="Email"
                >
                  <AtSign className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://wa.me/5493512345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#132645] text-[#94a3b8] transition-colors hover:bg-[#1b3763] hover:text-white"
                  aria-label="Compartir"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Columna 2 — Compañía */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#9aa8c3]">Compañía</h3>
              <ul className="flex flex-col gap-2.5">
                {footerLinks.compania.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`text-sm transition-colors ${link.href === "/registrar" ? "font-semibold text-[#2f7bff] hover:text-[#5c97ff]" : "text-[#9aa8c3] hover:text-white"}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 3 — Ayuda */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#9aa8c3]">Ayuda</h3>
              <ul className="flex flex-col gap-2.5">
                {footerLinks.ayuda.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#9aa8c3] transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 4 — Contacto */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#9aa8c3]">Contacto</h3>
              <div className="flex flex-col gap-2.5 text-sm text-[#9aa8c3]">
                <p className="flex items-start gap-3 leading-snug">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7bff]" />
                  <span>Av. del Libertador 1240, CABA, Argentina</span>
                </p>
                <a href="tel:+54414556677" className="flex items-center gap-3 transition-colors hover:text-white">
                  <Phone className="h-4 w-4 shrink-0 text-[#2f7bff]" />
                  <span>+54 11 4455-6677</span>
                </a>
                <a href="mailto:hola@amobly.com" className="flex items-center gap-3 transition-colors hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-[#2f7bff]" />
                  <span>hola@amobly.com</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-[#132645] py-4">
            <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-[#7c8daa] md:flex-row">
              <p>© {currentYear} Amobly Inc. Todos los derechos reservados.</p>
              <div className="flex items-center gap-6">
                <Link href="/terminos" className="transition-colors hover:text-white">Términos y condiciones</Link>
                <Link href="/privacidad" className="transition-colors hover:text-white">Política de privacidad</Link>
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}
