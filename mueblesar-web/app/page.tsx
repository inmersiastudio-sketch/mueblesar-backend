export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "./components/ui/Button";
import { Container } from "./components/layout/Container";
import { ProductCard } from "./components/products/ProductCard";
import { fetchProducts, fetchStores } from "./lib/api";

const categories = [
  { key: "living", label: "Living" },
  { key: "comedor", label: "Comedor" },
  { key: "dormitorio", label: "Dormitorio" },
  { key: "cocina", label: "Cocina" },
  { key: "oficina", label: "Oficina" },
  { key: "exterior", label: "Exterior" },
];

export default async function Home() {
  const [{ items: products }, { items: stores }] = await Promise.all([
    fetchProducts(),
    fetchStores(),
  ]);

  const featured = products.filter((p) => p.featured !== false).slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      <section className="bg-white py-12 shadow-sm">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">MueblesAR Córdoba</p>
              <h1 className="text-4xl font-bold leading-tight text-slate-900">
                Catálogo curado de mueblerías locales
              </h1>
              <p className="text-base text-slate-700">
                Explora sofás, mesas y más. Contactá por WhatsApp con cada mueblería y pedí detalles al instante.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/productos">Ver productos</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/mueblerias">Ver mueblerías</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-inner">
              <div className="text-sm font-semibold text-slate-700">Filtros inspirados en IKEA/Wayfair</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>• Navegación dual por ambiente y tipo de producto</li>
                <li>• Botón WhatsApp directo en PDP</li>
                <li>• Diseño mobile-first y carga rápida</li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-2xl font-semibold text-slate-900">Ambientes</h2>
            <Link href="/productos" className="text-sm font-semibold text-primary">
              Ver todo
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={`/productos?room=${cat.key}`}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-lg font-semibold text-slate-900">{cat.label}</div>
                <div className="text-sm text-slate-600">Explorá piezas para {cat.label.toLowerCase()}.</div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Destacados</p>
              <h2 className="text-2xl font-semibold text-slate-900">Productos seleccionados</h2>
            </div>
            <Link href="/productos" className="text-sm font-semibold text-primary">
              Ver catálogo
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length ? featured : products).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Mueblerías</p>
              <h2 className="text-2xl font-semibold text-slate-900">Aliados locales</h2>
            </div>
            <Link href="/mueblerias" className="text-sm font-semibold text-primary">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(stores.slice(0, 4) || []).map((store) => (
              <div key={store.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-lg font-semibold text-slate-900">{store.name}</div>
                <p className="text-sm text-slate-700">{store.description ?? "Mueblería local de Córdoba"}</p>
                <div className="pt-2 text-xs text-slate-500">WhatsApp: {store.whatsapp ?? "N/D"}</div>
              </div>
            ))}
            {stores.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Sin datos de mueblerías aún. Cargá el seed o agrega registros.
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
