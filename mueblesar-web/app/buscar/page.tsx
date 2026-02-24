export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ProductCard } from "../components/products/ProductCard";
import { fetchProducts, fetchStores } from "../lib/api";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const hasQuery = query.length > 0;

  const [productsRes, storesRes] = hasQuery
    ? await Promise.all([fetchProducts({ q: query }), fetchStores({ q: query })])
    : [
        { items: [], total: 0 },
        { items: [], total: 0 },
      ];

  const products = productsRes.items;
  const stores = storesRes.items;

  return (
    <div className="py-10">
      <Container>
        <div className="flex flex-col gap-3 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Buscar</p>
          <h1 className="text-3xl font-bold text-slate-900">Encontrá tu mueble</h1>
          <form className="flex max-w-xl gap-3" method="get">
            <Input name="q" defaultValue={query} placeholder="Ej: sofá gris, mesa roble" />
            <Button type="submit" className="shrink-0">
              Buscar
            </Button>
          </form>
        </div>

        {hasQuery && (
          <div className="space-y-10">
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary">Productos</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Resultados para "{query}"</h2>
                </div>
                <div className="text-sm text-slate-600">{productsRes.total} encontrados</div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Sin productos para esta búsqueda.
                  </div>
                )}

                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary">Mueblerías</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Locales que coinciden</h2>
                </div>
                <div className="text-sm text-slate-600">{storesRes.total} encontrados</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stores.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
                    No encontramos mueblerías para esta búsqueda.
                  </div>
                )}

                {stores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/mueblerias/${store.slug}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <span className="text-sm font-semibold">{store.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">{store.name}</div>
                        <div className="text-xs text-slate-500">{store.address ?? "Dirección no informada"}</div>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-700">{store.description ?? "Mueblería local"}</p>
                    <div className="text-xs text-slate-500">WhatsApp: {store.whatsapp ?? "N/D"}</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </Container>
    </div>
  );
}
