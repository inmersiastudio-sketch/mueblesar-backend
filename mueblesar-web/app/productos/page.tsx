export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { PriceRange } from "../components/filters/PriceRange";
import { ProductCard } from "../components/products/ProductCard";
import { AutoScrollToResults } from "../components/layout/AutoScrollToResults";
import { fetchProducts } from "../lib/api";
import { PLPAnalytics } from "../components/analytics/PLPAnalytics";

const categories = [
  { value: "sofas", label: "Sofás" },
  { value: "mesas", label: "Mesas" },
  { value: "sillas", label: "Sillas" },
  { value: "almacenamiento", label: "Almacenamiento" },
];

const rooms = [
  { value: "living", label: "Living" },
  { value: "comedor", label: "Comedor" },
  { value: "dormitorio", label: "Dormitorio" },
  { value: "cocina", label: "Cocina" },
  { value: "oficina", label: "Oficina" },
  { value: "exterior", label: "Exterior" },
];

const styles = [
  { value: "moderno", label: "Moderno" },
  { value: "clasico", label: "Clásico" },
  { value: "industrial", label: "Industrial" },
  { value: "escandinavo", label: "Escandinavo" },
];

type SearchParams = {
  q?: string;
  category?: string;
  room?: string;
  style?: string;
  priceMin?: string;
  priceMax?: string;
  page?: string;
  sort?: string;
  direction?: string;
  pageSize?: string;
  arOnly?: string;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const filters: Parameters<typeof fetchProducts>[0] = {
    q: params.q,
    category: params.category,
    room: params.room,
    style: params.style,
    priceMin: params.priceMin ? Number(params.priceMin) : undefined,
    priceMax: params.priceMax ? Number(params.priceMax) : undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 12,
    sort: params.sort === "price" ? "price" : "createdAt",
    direction: params.direction === "asc" ? "asc" : "desc",
    arOnly: params.arOnly === "true",
  };

  const { items, total, page } = await fetchProducts(filters);
  const arOnly = params.arOnly === "true";
  const displayItems = arOnly
    ? items
    : [...items].sort((a, b) => Number(Boolean(b.arUrl)) - Number(Boolean(a.arUrl)));
  const currentPage = page ?? filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPresetFilters = Boolean(params.category || params.room || params.style || params.priceMin || params.priceMax);

  return (
    <div className="py-10">
      <AutoScrollToResults anchorId="productos-grid" active={hasPresetFilters} />
      <Container>
        <PLPAnalytics />
        <div className="flex flex-col gap-2 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Catálogo</p>
          <h1 className="text-3xl font-bold text-slate-900">Productos</h1>
          {params.q && (
            <div className="mt-2 rounded-lg bg-primary/10 px-4 py-2">
              <p className="text-sm text-slate-700">
                Resultados de búsqueda para: <span className="font-semibold">&quot;{params.q}&quot;</span>
              </p>
            </div>
          )}
          <p className="text-sm text-slate-600">Mostrando {total} {total === 1 ? "producto" : "productos"}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <form id="plp-filters" className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" method="get">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800">Categoría</label>
              <select name="category" defaultValue={params.category ?? ""} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800">Ambiente</label>
              <select name="room" defaultValue={params.room ?? ""} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">Todos</option>
                {rooms.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800">Estilo</label>
              <select name="style" defaultValue={params.style ?? ""} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">Todos</option>
                {styles.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <PriceRange defaultMin={params.priceMin ? Number(params.priceMin) : undefined} defaultMax={params.priceMax ? Number(params.priceMax) : undefined} />

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800">Orden</label>
              <div className="grid grid-cols-2 gap-2">
                <select name="sort" defaultValue={params.sort ?? "createdAt"} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="createdAt">Más recientes</option>
                  <option value="price">Precio</option>
                </select>
                <select name="direction" defaultValue={params.direction ?? "desc"} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800">Items por página</label>
              <select name="pageSize" defaultValue={String(pageSize)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                {[6, 12, 18, 24].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="arOnly" value="true" defaultChecked={params.arOnly === "true"} className="h-4 w-4" />
              <label className="font-semibold">Solo productos con AR</label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="w-full">
                Aplicar filtros
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/productos">Limpiar</Link>
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="grid items-center gap-3 sm:grid-cols-2">
              <div className="text-sm text-slate-600">Página {currentPage} de {totalPages}</div>
              <div className="flex justify-end gap-2">
                <Link
                  href={{ pathname: "/productos", query: { ...params, page: Math.max(1, currentPage - 1) } }}
                  data-page={Math.max(1, currentPage - 1)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-primary hover:text-primary"
                  aria-disabled={currentPage <= 1}
                >
                  Anterior
                </Link>
                <Link
                  href={{ pathname: "/productos", query: { ...params, page: Math.min(totalPages, currentPage + 1) } }}
                  data-page={Math.min(totalPages, currentPage + 1)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-primary hover:text-primary"
                  aria-disabled={currentPage >= totalPages}
                >
                  Siguiente
                </Link>
              </div>
            </div>

            <div id="productos-grid" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
                Sin resultados. Ajustá filtros o agrega más productos.
              </div>
            )}
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
