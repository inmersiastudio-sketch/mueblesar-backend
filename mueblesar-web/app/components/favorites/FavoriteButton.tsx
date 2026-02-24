"use client";

import { FavoriteItem, useFavorites } from "../../lib/favorites";

type Props = {
  product: FavoriteItem;
  size?: "sm" | "md";
};

export function FavoriteButton({ product, size = "md" }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(product.slug);

  const baseClasses =
    "inline-flex items-center justify-center rounded-full border transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const colorClasses = active
    ? "border-primary/60 bg-primary/10 text-primary"
    : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`${baseClasses} ${sizeClasses} ${colorClasses}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
      }}
    >
      {active ? "❤" : "♡"}
    </button>
  );
}
