import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCatalogBySlug, CatalogFilters } from "@/app/lib/api";
import { Container } from "@/app/components/layout/Container";
import { CatalogProductCard } from "@/app/components/products/CatalogProductCard";
import { Button } from "@/app/components/ui/Button";
import { PriceRange } from "@/app/components/filters/PriceRange";
import { MapPin, Phone, ArrowLeft, MessageCircle, Building2, ChevronDown } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
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
  }>;
}

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

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const response = await fetchCatalogBySlug(slug);
  const catalog = response?.data;

  if (!catalog) {
    return {
      title: "Catálogo no encontrado | Amobly",
    };
  }

  return {
    title: `${catalog.store.name} | Catálogo`,
    description: catalog.store.description || `Explora el catálogo de ${catalog.store.name}`,
    openGraph: {
      title: `${catalog.store.name} | Catálogo`,
      description: catalog.store.description || `Explora el catálogo de ${catalog.store.name}`,
      type: "website",
    },
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const paramsAwaited = await searchParams;

  // Build filters
  const filters: CatalogFilters = {
    category: paramsAwaited.category,
    room: paramsAwaited.room,
    style: paramsAwaited.style,
    priceMin: paramsAwaited.priceMin ? Number(paramsAwaited.priceMin) : undefined,
    priceMax: paramsAwaited.priceMax ? Number(paramsAwaited.priceMax) : undefined,
    page: paramsAwaited.page ? Number(paramsAwaited.page) : 1,
    pageSize: paramsAwaited.pageSize ? Number(paramsAwaited.pageSize) : 12,
    sort: paramsAwaited.sort === "price" ? "price" : "createdAt",
    direction: paramsAwaited.direction === "asc" ? "asc" : "desc",
    arOnly: paramsAwaited.arOnly === "true",
  };

  const response = await fetchCatalogBySlug(slug, filters);

  if (!response) {
    notFound();
  }

  const { store, products, pagination } = response.data;
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const total = pagination.total;
  const pageSize = pagination.pageSize;

  const hasFilters = Boolean(
    paramsAwaited.category || 
    paramsAwaited.room || 
    paramsAwaited.style || 
    paramsAwaited.priceMin || 
    paramsAwaited.priceMax ||
    paramsAwaited.arOnly
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <div className="border-b border-slate-200 bg-white">
        <Container>
          <div className="flex h-14 items-center gap-4">
            <Link 
              href="/mueblerias" 
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Volver a mueblerías</span>
            </Link>
          </div>
        </Container>
      </div>

      {/* Store Header */}
      <div className="border-b border-slate-200 bg-slate-50">
        <Container>
          <div className="py-10 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              {/* Store Logo */}
              <div className="flex-shrink-0">
                {store.logoUrl ? (
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <Image
                      src={store.logoUrl}
                      alt={store.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-slate-200 flex items-center justify-center border border-slate-300">
                    <span className="text-3xl md:text-4xl font-bold text-slate-500">
                      {getInitials(store.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Store Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Building2 size={16} />
                  <span>Catálogo de mueblería</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="mt-2 text-slate-600 max-w-2xl">
                    {store.description}
                  </p>
                )}
                
                {/* Contact Info */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  {store.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {store.address}
                    </span>
                  )}
                  {store.whatsapp && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} />
                      {store.whatsapp}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Button */}
              {store.whatsapp && (
                <div className="flex-shrink-0">
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Contactar</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Products Section */}
      <Container>
        <div className="py-10">
          {/* Header with count and pagination */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                Catálogo de Productos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {total} {total === 1 ? "producto" : "productos"} disponibles
              </p>
            </div>

            {/* Top Pagination */}
            <div className="flex items-center gap-4 border-t border-slate-200 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto mt-4 md:mt-0">
              <div className="text-sm font-medium text-slate-500 mr-auto md:mr-4">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Link
                  href={{ pathname: `/catalog/${slug}`, query: { ...paramsAwaited, page: Math.max(1, currentPage - 1) } }}
                  data-page={Math.max(1, currentPage - 1)}
                  className="inline-flex h-10 px-4 items-center justify-center rounded-sm border border-slate-200 text-sm font-bold text-[#111] transition hover:border-slate-400 disabled:opacity-50 disabled:pointer-events-none"
                  aria-disabled={currentPage <= 1}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                >
                  Anterior
                </Link>
                <Link
                  href={{ pathname: `/catalog/${slug}`, query: { ...paramsAwaited, page: Math.min(totalPages, currentPage + 1) } }}
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
            {/* Filters */}
            <form id="catalog-filters" className="space-y-6" method="get" key={JSON.stringify(paramsAwaited)}>
              {/* Preserve existing params */}
              <input type="hidden" name="page" value="1" />

              <div className="border-b border-slate-200 pb-6">
                <label className="text-sm font-bold text-slate-900 block mb-3">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer">
                    <input type="radio" name="category" value="" defaultChecked={!paramsAwaited.category} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todas</span>
                  </label>
                  {categories.map((c) => (
                    <label key={c.value} className="cursor-pointer">
                      <input type="radio" name="category" value={c.value} defaultChecked={paramsAwaited.category === c.value} className="peer hidden" />
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
                    <input type="radio" name="room" value="" defaultChecked={!paramsAwaited.room} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todos</span>
                  </label>
                  {rooms.map((c) => (
                    <label key={c.value} className="cursor-pointer">
                      <input type="radio" name="room" value={c.value} defaultChecked={paramsAwaited.room === c.value} className="peer hidden" />
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
                    <input type="radio" name="style" value="" defaultChecked={!paramsAwaited.style} className="peer hidden" />
                    <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">Todos</span>
                  </label>
                  {styles.map((c) => (
                    <label key={c.value} className="cursor-pointer">
                      <input type="radio" name="style" value={c.value} defaultChecked={paramsAwaited.style === c.value} className="peer hidden" />
                      <span className="inline-block px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-slate-50">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-200 pb-6">
                <label className="text-sm font-bold text-slate-900 block mb-4">Rango de Precio</label>
                <PriceRange 
                  defaultMin={paramsAwaited.priceMin ? Number(paramsAwaited.priceMin) : undefined} 
                  defaultMax={paramsAwaited.priceMax ? Number(paramsAwaited.priceMax) : undefined} 
                />
              </div>

              <div className="border-b border-slate-200 pb-6">
                <label className="text-sm font-bold text-slate-900 block mb-3">Ordenar por</label>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <select name="sort" defaultValue={paramsAwaited.sort ?? "createdAt"} className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary p-3 pr-10 cursor-pointer appearance-none outline-none font-medium hover:border-slate-300 transition-colors">
                      <option value="createdAt">Más recientes</option>
                      <option value="price">Precio</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select name="direction" defaultValue={paramsAwaited.direction ?? "desc"} className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary p-3 pr-10 cursor-pointer appearance-none outline-none font-medium hover:border-slate-300 transition-colors">
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
                <input id="arOnly" type="checkbox" name="arOnly" value="true" defaultChecked={paramsAwaited.arOnly === "true"} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-colors" />
              </div>

              <div className="flex flex-col gap-3 pt-6 relative z-10 sticky bottom-4 bg-white">
                <Button type="submit" className="w-full bg-[#0058a3] text-white hover:bg-[#004f93] rounded-full font-bold h-12 shadow-sm transition-transform active:scale-[0.98]">
                  Aplicar filtros
                </Button>
                {hasFilters && (
                  <Button variant="ghost" asChild className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full font-bold h-12 border-none">
                    <Link href={`/catalog/${slug}`}>Limpiar filtros</Link>
                  </Button>
                )}
              </div>
            </form>

            {/* Products Grid */}
            <div className="space-y-4">
              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    No hay productos disponibles
                  </h3>
                  <p className="mt-1 text-slate-500">
                    {hasFilters 
                      ? "No se encontraron productos con los filtros aplicados."
                      : "Esta tienda aún no ha publicado productos en su catálogo."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <CatalogProductCard 
                      key={product.id} 
                      product={product} 
                      storeSlug={slug}
                      storeName={store.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <Container>
          <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
            </p>
            <p className="text-sm text-slate-400">
              Catálogo digital por{" "}
              <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium">
                Amobly
              </Link>
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
