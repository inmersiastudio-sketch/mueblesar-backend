"use client";

import Link from "next/link";
import { FavoriteItem, useFavorites } from "../../lib/favorites";
import { ProductCard } from "../products/ProductCard";

export function FavoritesView() {
  const { items } = useFavorites();

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        Aún no tenés favoritos. Volvé al catálogo y guardá lo que te guste.
      </div>
    );
  }

  const toProductCard = (fav: FavoriteItem) => ({
    ...fav,
    store: fav.storeSlug || fav.storeName ? { name: fav.storeName ?? "", slug: fav.storeSlug ?? "" } : undefined,
    images: fav.imageUrl ? [{ url: fav.imageUrl }] : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((fav) => (
          <ProductCard key={fav.slug} product={toProductCard(fav)} />
        ))}
      </div>
      <Link
        href="/productos"
        className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
      >
        Seguir explorando
      </Link>
    </div>
  );
}
