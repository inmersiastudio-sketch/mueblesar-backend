"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "../components/products/ProductCard";
import type { ProductCardData } from "../components/products/ProductCard";

const ROOMS = ["Todos", "Living", "Comedor", "Dormitorio", "Baño", "Cocina", "Oficina", "Exterior"];
const SIDEBAR_FILTERS = [
  "Ambiente", "Categoría", "Tipo", "Color", "Material", "Precio", "Aspecto", "Características"
];
const SIDEBAR_CHECKBOXES = [
  { label: "Más vendido", count: 9 },
  { label: "Precio especial", count: 4 },
  { label: "Valoración del cliente", isAccordion: true },
  { label: "Nuevos productos", count: 27 },
  { label: "Frente", isAccordion: true }
];

const PAGE_SIZE = 8;

function FilterAccordion({ title, isMainFilter, currentValue, onChange }: { title: string, isMainFilter?: boolean, currentValue?: string, onChange?: (val: string) => void }) {
  const options = isMainFilter ? ROOMS : ["Ejemplo 1", "Ejemplo 2", "Ejemplo 3"];

  return (
    <details className="group border-b border-[#e2e8f0] py-3.5" open={isMainFilter}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-[#0f172a] focus:outline-none">
        {title}
        <span className="transition duration-200 group-open:rotate-180">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </summary>
      <div className="pt-4 pb-2 text-sm text-[#475569] flex flex-col gap-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer group/label">
            <input 
              type={isMainFilter ? "radio" : "checkbox"} 
              name={isMainFilter ? "ambiente" : title}
              checked={isMainFilter ? currentValue === opt : false}
              onChange={() => onChange?.(opt)}
              className="w-[18px] h-[18px] rounded-sm border-[#e2e8f0] text-[#1d4ed8] focus:ring-[#1d4ed8] transition-colors" 
            />
            <span className="group-hover/label:text-[#0f172a] transition-colors">{opt}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

interface Props {
  initialProducts: ProductCardData[];
}

export function ProductsClient({ initialProducts }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(true);

  const filtered = useMemo(() => {
    let items = initialProducts;

    // Room filter
    if (selectedCategory !== "Todos") {
      const q = selectedCategory.toLowerCase();
      items = items.filter((p) => {
        const room = (p.room ?? "").toLowerCase();
        return room === q || room.includes(q) || q.includes(room);
      });
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.room ?? "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [initialProducts, selectedCategory, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a]">Catálogo</h1>
          <p className="text-[#64748b] mt-1">Descubrí nuestra colección de muebles premium</p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus-within:border-[#1d4ed8] focus-within:ring-1 focus-within:ring-[#1d4ed8] transition-all">
            <Search className="w-4 h-4 text-[#94a3b8] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-[#94a3b8] text-[#0f172a]"
            />
            {search && (
              <button type="button" onClick={() => handleSearch("")} className="text-[#94a3b8] hover:text-[#0f172a]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 font-semibold transition-colors ${
              showFilters
                ? "bg-[#1d4ed8] border-[#1d4ed8] text-white"
                : "bg-white border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Ocultar Filtros
          </button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row mt-6">
        {/* Sidebar Filters */}
        {showFilters && (
          <aside className="w-full shrink-0 lg:w-[260px]">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-lg text-[#0f172a]">Filtros</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("Todos");
                  setSearch("");
                  setVisibleCount(PAGE_SIZE);
                }}
                className="text-sm font-medium text-[#64748b] hover:text-[#1d4ed8] transition-colors"
              >
                Limpiar todo
              </button>
            </div>

            {/* Accordion Filters */}
            <div className="flex flex-col">
              {SIDEBAR_FILTERS.map((title) => (
                <FilterAccordion 
                  key={title} 
                  title={title} 
                  isMainFilter={title === "Ambiente"}
                  currentValue={selectedCategory}
                  onChange={handleCategoryChange}
                />
              ))}
            </div>

            {/* Checkbox / Accordion Mix */}
            <div className="flex flex-col mt-2">
              {SIDEBAR_CHECKBOXES.map((item) => (
                item.isAccordion ? (
                  <FilterAccordion key={item.label} title={item.label} />
                ) : (
                  <label key={item.label} className="flex cursor-pointer items-center justify-between border-b border-gray-200 py-3.5 group">
                    <span className="font-bold text-[#0f172a]">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{item.count}</span>
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8]" />
                    </div>
                  </label>
                )
              ))}
            </div>
          </aside>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full">
          {/* Results count */}
          {(search || selectedCategory !== "Todos") && (
            <p className="mb-4 text-sm font-medium text-[#64748b]">
              {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
              {selectedCategory !== "Todos" && ` en ${selectedCategory}`} 
              {search && ` para "${search}"`}
            </p>
          )}

          {/* Products Grid */}
          {visible.length > 0 ? (
            <div className={`grid grid-cols-2 gap-4 md:gap-6 ${showFilters ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xl font-semibold text-[#0f172a]">No hay productos</p>
          <p className="mt-2 text-sm text-[#64748b]">
            Intentá con otra categoría o término de búsqueda
          </p>
          <button
            type="button"
            onClick={() => { setSearch(""); setSelectedCategory("Todos"); }}
            className="mt-4 rounded-xl bg-[#1d4ed8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Load More */}
      {hasMore && visible.length > 0 && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-8 py-3 font-semibold text-[#0f172a] transition-colors hover:bg-[#f8fafc]"
          >
            Cargar más productos ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}
      
        </div>
      </div>
    </>
  );
}
