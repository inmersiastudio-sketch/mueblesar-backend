export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "./components/ui/Button";
import { Container } from "./components/layout/Container";
import { ProductCard } from "./components/products/ProductCard";
import { MarketplaceProductCard } from "./components/products/MarketplaceProductCard";
import { DynamicCategorySlider } from "./components/ui/DynamicCategorySlider";
import { fetchProducts, fetchStores } from "./lib/api";
import { Store as StoreIcon, ArrowRight } from "lucide-react";
import { StoreCard } from "./components/store/StoreCard";
import type { Product, Store } from "@/types";

const categories = [
  { key: "living", label: "Living", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800" },
  { key: "comedor", label: "Comedor", image: "https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&q=80&w=800" },
  { key: "dormitorio", label: "Dormitorio", image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&q=80&w=800" },
  { key: "cocina", label: "Cocina", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800" },
  { key: "oficina", label: "Oficina", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800" },
  { key: "exterior", label: "Exterior", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800" },
];

export default async function Home() {
  const [{ items: products }, { items: stores }] = await Promise.all([
    fetchProducts(),
    fetchStores(),
  ]);

  const featured = products.filter((p: Product) => p.featured !== false).slice(0, 6);

  return (
    <div className="space-y-0 pb-0">
      {/* Hero Section - IKEA Style */}
      <section className="relative overflow-hidden bg-primary min-h-[400px] md:min-h-[500px] flex items-center">
        <Container className="relative z-10 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                Muebles para tu hogar
              </h1>
              <p className="text-lg text-white/80 leading-relaxed max-w-lg">
                El catálogo curado de mueblerías cordobesas. Explorá en 3D y contactá directamente por WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button asChild size="lg" className="bg-[#ffe815] text-slate-800 font-bold shadow-[0_4px_14px_0_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all duration-300 px-8 border-none ring-0">
                  <Link href="/productos">Explorar catálogo</Link>
                </Button>
                <Button variant="secondary" asChild size="lg" className="bg-transparent border-2 border-white/40 font-bold text-white hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300">
                  <Link href="/mueblerias">Ver mueblerías</Link>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1000"
                alt="Muebles de diseño"
                className="w-full h-auto object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Categories - Large Grid */}
      <section className="bg-white py-8">
        <Container>
          <div className="flex items-center justify-between pb-6">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Explorá por ambiente</h2>
            <Link href="/productos" className="hidden md:inline-flex text-sm font-bold text-gray-900 hover:underline underline-offset-4">
              Ver todos →
            </Link>
          </div>

          {/* Grid Layout - 3 columns on desktop, 2 on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {categories.map((cat, index) => (
              <Link
                key={cat.key}
                href={`/productos?room=${cat.key}`}
                className={`group relative overflow-hidden bg-gray-100 ${index === 0 ? 'col-span-2 md:col-span-2 aspect-[16/9] md:aspect-[2/1]' : 'aspect-square'
                  }`}
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                  <h3 className="text-lg md:text-2xl font-bold text-white drop-shadow-lg">
                    {cat.label}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-sm text-white/90 font-medium mt-1 group-hover:underline">
                    Ver productos
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center md:hidden">
            <Link href="/productos" className="inline-block w-full bg-dark text-white font-bold py-3 px-6 text-sm transition hover:bg-gray-800">
              Ver todos los ambientes
            </Link>
          </div>
        </Container>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-12">
        <DynamicCategorySlider
          subtitle="Destacados"
          title="Productos populares"
          viewAllLink="/productos"
          viewAllText="Ver catálogo"
        >
          {(featured.length ? featured : products).map((product: Product) => (
            <MarketplaceProductCard key={product.id} product={product} />
          ))}
        </DynamicCategorySlider>
      </section>

      {/* Stores Section */}
      <section className="bg-slate-50 py-14">
        <Container>
          <div className="flex items-center justify-between pb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Mueblerías aliadas</h2>
              <p className="mt-2 text-slate-600">Comercios locales de Córdoba con catálogos digitales</p>
            </div>
            <Link 
              href="/mueblerias" 
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-slate-700 transition-colors"
            >
              Ver todas
              <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(stores.slice(0, 4) || []).map((store: Store) => (
              <StoreCard key={store.id} store={store} variant="featured" />
            ))}
            {stores.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <StoreIcon className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-600">Próximamente mueblerías adheridas</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link 
              href="/mueblerias" 
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver todas las mueblerías
              <ArrowRight size={16} />
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
