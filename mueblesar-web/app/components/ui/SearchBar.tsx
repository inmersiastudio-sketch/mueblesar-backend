"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchResult = {
  products: { id: number; name: string; slug: string; price: string; imageUrl: string | null }[];
  stores: { id: number; name: string; slug: string; logoUrl: string | null }[];
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setShowDropdown(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [productsRes, storesRes] = await Promise.all([
          fetch(`/api/products?q=${encodeURIComponent(query)}&pageSize=5`),
          fetch(`/api/stores?q=${encodeURIComponent(query)}`),
        ]);
        const productsData = await productsRes.json();
        const storesData = await storesRes.json();
        setResults({
          products: productsData.items?.slice(0, 5) || [],
          stores: storesData.items?.slice(0, 3) || [],
        });
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/productos?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          placeholder="Buscar muebles, mueblerias..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          aria-label="Buscar productos y tiendas"
        />
      </form>

      {showDropdown && results && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Products */}
          {results.products.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Productos</h3>
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/producto/${product.slug}`}
                  onClick={() => {
                    setShowDropdown(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition"
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Stores */}
          {results.stores.length > 0 && (
            <div className="p-2 border-t">
              <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Mueblerias</h3>
              {results.stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/muebleria/${store.slug}`}
                  onClick={() => {
                    setShowDropdown(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition"
                >
                  {store.logoUrl && (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-10 h-10 object-cover rounded-full"
                    />
                  )}
                  <p className="text-sm font-medium text-gray-900">{store.name}</p>
                </Link>
              ))}
            </div>
          )}

          {results.products.length === 0 && results.stores.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          )}

          <div className="p-2 border-t bg-gray-50">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full text-sm text-primary font-medium py-2 hover:underline"
            >
              Ver todos los resultados para &quot;{query}&quot;
            </button>
          </div>
        </div>
      )}

      {loading && showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          Buscando...
        </div>
      )}
    </div>
  );
}
