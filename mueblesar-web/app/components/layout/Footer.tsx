import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white py-8">
      <Container>
        <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold text-slate-800">MueblesAR</div>
          <nav className="flex flex-wrap gap-4">
            <Link href="/productos" className="hover:text-primary">
              Productos
            </Link>
            <Link href="/mueblerias" className="hover:text-primary">
              Mueblerías
            </Link>
            <Link href="/registrar" className="font-semibold text-primary hover:underline">
              Vender en Amobly
            </Link>
          </nav>
          <div className="text-slate-500">Inspirado en Córdoba. WhatsApp directo con mueblerías.</div>
        </div>
      </Container>
    </footer>
  );
}
