export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { PriceRange } from "../components/filters/PriceRange";
import { MarketplaceProductCard } from "../components/products/MarketplaceProductCard";
import { AutoScrollToResults } from "../components/layout/AutoScrollToResults";
import { fetchProducts } from "../lib/api";
import type { Product } from "@/types";
import { PLPAnalytics } from "../components/analytics/PLPAnalytics";
import { ChevronDown } from "lucide-react";

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
      <div className="mx-auto w-full px-4 md:px-8 max-w-[1600px]">
        <PLPAnalytics />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-8 mt-2">
          {params.q ? (
            <h1 className="text-2xl text-[#111] leading-none">
              <span className="font-bold text-[32px] md:text-[40px] tracking-tight">{total}</span> resultados para &quot;{params.q}&quot;
            </h1>
          ) : (
            <h1 className="text-2xl text-[#111] leading-none">
              <span className="font-bold text-[32px] md:text-[40px] tracking-tight">{total}</span> productos en el catálogo
            </h1>
          )}

          {/* Top Pagination */}
          <div className="flex items-center gap-4 border-t border-slate-200 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto mt-4 md:mt-0">
            <div className="text-sm font-medium text-slate-500 mr-auto md:mr-4">Página {currentPage} de {totalPages}</div>
            <div className="flex gap-2">
              <Link
                href={{ pathname: "/productos", query: { ...params, page: Math.max(1, currentPage - 1) } }}
                data-page={Math.max(1, currentPage - 1)}
                className="inline-flex h-10 px-4 items-center justify-center rounded-sm border border-slate-200 text-sm font-bold text-[#111] transition hover:border-slate-400 disabled:opacity-50 disabled:pointer-events-none"
                aria-disabled={currentPage <= 1}
                tabIndex={currentPage <= 1 ? -1 : undefined}
              >
                Anterior
              </Link>
              <Link
                href={{ pathname: "/productos", query: { ...params, page: Math.min(totalPages, currentPage + 1) } }}
                data-page={Math.min(totalPages, currentPage + 1)}
                className="inline-flex h-10 px-4 items-center justify-center rounded-sm border border-slate-200 text-sm font-bold text-[#111] transition hover:border-slate-400 disabled:opacity-50 disabled:pointer-events-none"
                aria-disabled={currentPage >= totalPages}
                tabIndex={currentPage >= totalPages ? -1 : undefined}
              >
                Siguiente
              </Link>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="w-full h-px bg-slate-200 mb-8 max-w-[calc(100%-250px)] ml-auto hidden lg:block" />

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <form id="plp-filters" className="space-y-6" method="get" key={JSON.stringify(params)}>
            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-3">
                Categoría
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <input type="radio" name="category" value="" defaultChecked={!params.category} className="peer hidden" />
                  <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todas</span>
                </label>
                {categories.map((c) => (
                  <label key={c.value} className="cursor-pointer">
                    <input type="radio" name="category" value={c.value} defaultChecked={params.category === c.value} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-3">
                Ambiente
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <input type="radio" name="room" value="" defaultChecked={!params.room} className="peer hidden" />
                  <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todos</span>
                </label>
                {rooms.map((c) => (
                  <label key={c.value} className="cursor-pointer">
                    <input type="radio" name="room" value={c.value} defaultChecked={params.room === c.value} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-3">
                Estilo
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <input type="radio" name="style" value="" defaultChecked={!params.style} className="peer hidden" />
                  <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todos</span>
                </label>
                {styles.map((c) => (
                  <label key={c.value} className="cursor-pointer">
                    <input type="radio" name="style" value={c.value} defaultChecked={params.style === c.value} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-4">Rango de Precio</label>
              <PriceRange defaultMin={params.priceMin ? Number(params.priceMin) : undefined} defaultMax={params.priceMax ? Number(params.priceMax) : undefined} />
            </div>

            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-3">Ordenar por</label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <select name="sort" defaultValue={params.sort ?? "createdAt"} className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary p-3 pr-10 cursor-pointer appearance-none outline-none font-medium hover:border-slate-300 transition-colors">
                    <option value="createdAt">Más recientes</option>
                    <option value="price">Precio</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select name="direction" defaultValue={params.direction ?? "desc"} className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary p-3 pr-10 cursor-pointer appearance-none outline-none font-medium hover:border-slate-300 transition-colors">
                    <option value="desc">Descendente</option>
                    <option value="asc">Ascendente</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <label className="text-sm font-bold text-slate-900 block mb-3">Mostrar resultados</label>
              <div className="relative">
                <select name="pageSize" defaultValue={String(pageSize)} className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary p-3 pr-10 cursor-pointer appearance-none outline-none font-medium hover:border-slate-300 transition-colors">
                  {[6, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <label htmlFor="arOnly" className="text-sm font-bold text-slate-900 cursor-pointer select-none">Solo interactivos 3D/AR</label>
              <input id="arOnly" type="checkbox" name="arOnly" value="true" defaultChecked={params.arOnly === "true"} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-colors" />
            </div>

            <div className="flex flex-col gap-3 pt-6 relative z-10 sticky bottom-4 bg-white">
              <Button type="submit" className="w-full bg-[#0058a3] text-white hover:bg-[#004f93] rounded-full font-bold h-12 shadow-sm transition-transform active:scale-[0.98]">
                Aplicar filtros
              </Button>
              {hasPresetFilters && (
                <Button variant="ghost" asChild className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full font-bold h-12 border-none">
                  <Link href="/productos">Limpiar filtros</Link>
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-4">
            <div id="productos-grid" className="grid gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {items.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
                  Sin resultados. Ajustá filtros o agrega más productos.
                </div>
              )}
              {items.map((product: Product) => (
                <MarketplaceProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
