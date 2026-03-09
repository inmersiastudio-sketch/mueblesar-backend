"use client";

import Link from "next/link";
import { FavoriteButton } from "../favorites/FavoriteButton";
import { AddToCartButton } from "../cart/AddToCartButton";

// Product-like shape used across listados y favoritos
export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
  room?: string | null;
  style?: string | null;
  imageUrl?: string | null;
  arUrl?: string | null;
  images?: { url: string; type?: string | null }[];
  store?: { name?: string | null; slug?: string | null };
  color?: string | null;
  inStock?: boolean;
  stockQty?: number | null;
  featured?: boolean;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
};

type Props = {
  product: ProductCardData;
};

export function ProductCard({ product }: Props) {
  const image = product.images?.[0]?.url ?? product.imageUrl;
  const price = typeof product.price === "string" ? Number(product.price) : product.price;

  return (
    <article className="group relative flex flex-col">
      {/* Image Container */}
      <Link
        href={`/productos/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-gray-100"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Sin imagen
          </div>
        )}

        {/* AR Badge */}
        {product.arUrl && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1">
            Ver en AR
          </span>
        )}

        {/* Out of Stock Badge */}
        {product.inStock === false && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
              Agotado
            </span>
          </div>
        )}
      </Link>

      {/* Quick Actions - Appear on Hover */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <AddToCartButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: price ?? 0,
            imageUrl: image ?? null,
            storeName: product.store?.name ?? "Sin tienda",
            storeSlug: product.store?.slug ?? "",
            storeWhatsapp: null,
          }}
          variant="compact"
        />
        <FavoriteButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: price ?? 0,
            imageUrl: image,
            category: product.category,
            room: product.room,
            style: product.style,
            description: product.description,
            storeName: product.store?.name,
            storeSlug: product.store?.slug,
          }}
          size="sm"
        />
      </div>

      {/* Product Info */}
      <div className="flex flex-col pt-3 pb-2">
        {/* Store Name */}
        {product.store?.name && (
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
            {product.store.name}
          </span>
        )}

        {/* Product Name */}
        <Link href={`/productos/${product.slug}`}>
          <h3 className="text-sm font-bold text-gray-900 leading-tight hover:underline line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Brief Description */}
        {product.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="mt-2">
          <span className="text-lg font-bold text-gray-900">
            ${price?.toLocaleString("es-AR")}
          </span>
        </div>

        {/* Category Tag */}
        {product.category && (
          <div className="mt-2">
            <span className="inline-block bg-primary/20 text-gray-900 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5">
              {product.category}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
