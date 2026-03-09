import Link from "next/link";
import { Container } from "../components/layout/Container";
import { StoreCard } from "../components/store/StoreCard";
import { fetchStores } from "../lib/api";
import type { Store } from "@/types";
import { Building2, Search, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Mueblerías Aliadas | Amobly",
  description: "Descubrí las mejores mueblerías de Córdoba. Catálogos digitales con realidad aumentada.",
};

export default async function StoresPage() {
  const { items } = await fetchStores();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="border-b border-slate-200 bg-white">
        <Container>
          <div className="py-12 md:py-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Building2 size={16} />
                <span>Directorio de comercios</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Mueblerías aliadas
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Explorá el catálogo digital de las mejores mueblerías de Córdoba. 
                Visualizá los productos en tu espacio con realidad aumentada.
              </p>
            </div>
          </div>
        </Container>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-slate-200 bg-slate-50">
        <Container>
          <div className="flex items-center gap-6 py-4 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{items.length}</span>
            <span>mueblerías disponibles</span>
          </div>
        </Container>
      </div>

      {/* Stores Grid */}
      <Container>
        <div className="py-10">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No hay mueblerías registradas
              </h3>
              <p className="mt-2 text-slate-600">
                Pronto podrás ver los comercios adheridos a la plataforma.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((store: Store) => (
                <StoreCard key={store.id} store={store} variant="default" />
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* CTA Section */}
      <div className="border-t border-slate-200 bg-white">
        <Container>
          <div className="py-12">
            <div className="rounded-2xl bg-slate-900 px-6 py-10 md:px-12 md:py-12">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white md:text-2xl">
                    ¿Tenés una mueblería?
                  </h2>
                  <p className="mt-2 text-slate-400">
                    Unite a la plataforma y llegá a más clientes con catálogos digitales en AR.
                  </p>
                </div>
                <Link
                  href="/contacto"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Contactanos
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
