import Link from "next/link";
import { Container } from "./Container";
import { SearchBar } from "../ui/SearchBar";

const nav = [
  { href: "/productos", label: "Productos" },
  { href: "/mueblerias", label: "Mueblerías" },
  { href: "/favoritos", label: "Favoritos" },
  { href: "/registrar", label: "Vender", highlight: true },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" className="text-lg font-semibold text-slate-900 flex-shrink-0">
            MueblesAR
          </Link>
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <SearchBar />
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 sm:flex flex-shrink-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.highlight
                    ? "rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-primary/90"
                    : "hover:text-primary"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </header>
  );
}
