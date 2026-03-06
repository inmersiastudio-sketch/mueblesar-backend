import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";

const currentYear = new Date().getFullYear();

const footerLinks = {
  catalogo: [
    { href: "/productos", label: "Todos los productos" },
    { href: "/productos?arOnly=true", label: "Con realidad aumentada" },
    { href: "/mueblerias", label: "Mueblerías" },
    { href: "/buscar", label: "Buscar" },
  ],
  categorias: [
    { href: "/productos?category=sofas", label: "Sofás" },
    { href: "/productos?category=mesas", label: "Mesas" },
    { href: "/productos?category=sillas", label: "Sillas" },
    { href: "/productos?category=camas", label: "Camas" },
  ],
  empresa: [
    { href: "/registrar", label: "Vender en Amobly" },
    { href: "/contacto", label: "Contacto" },
    { href: "/terminos", label: "Términos y condiciones" },
    { href: "/privacidad", label: "Política de privacidad" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-5">
            <Link href="/" className="inline-block bg-primary px-3 py-2">
              <Image
                src="/logo.png"
                alt="Amobly"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              El catálogo curado de mueblerías cordobesas.
              Explorá muebles en 3D y contactá directamente por WhatsApp.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              <a
                href="https://instagram.com/amobly.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center bg-gray-800 text-white hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="https://facebook.com/amobly.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center bg-gray-800 text-white hover:bg-primary hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a
                href="https://wa.me/5493512345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center bg-gray-800 text-white hover:bg-whatsapp transition-colors"
                aria-label="WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Catálogo */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Catálogo
            </h3>
            <ul className="space-y-3">
              {footerLinks.catalogo.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Categorías
            </h3>
            <ul className="space-y-3">
              {footerLinks.categorias.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Empresa
            </h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${link.href === "/registrar"
                        ? "font-bold text-primary hover:text-primary-600"
                        : "text-gray-400 hover:text-primary"
                      }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 py-6 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-gray-500">
              © {currentYear} Amobly. Todos los derechos reservados.
            </p>
            <p className="text-sm text-gray-500">
              Hecho con ❤️ en Córdoba, Argentina
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
