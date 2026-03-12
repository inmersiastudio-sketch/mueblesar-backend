"use client";

import Link from "next/link";
import { FavoriteButton } from "../favorites/FavoriteButton";
import { AddToCartButton } from "../cart/AddToCartButton";

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
  images?: { id?: number; url: string; type?: string | null }[];
  store?: { id?: number; name?: string | null; slug?: string | null };
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
  
  // Mock data para el diseño tipo MercadoLibre
  const originalPrice = Math.round(price * 1.74);
  const discount = 74;
  const cuota = Math.round(price / 6);

  return (
    <article className="group overflow-hidden rounded-lg border border-[#e2e8f0] bg-white transition-all duration-200 hover:shadow-md sm:rounded-xl">
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-[#f8fafc]">
        <Link href={`/productos/${product.slug}`} className="block w-full h-full">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-2 sm:p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#94a3b8] sm:text-sm">
              Sin imagen
            </div>
          )}
        </Link>

        {/* Badge */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
          <span className="rounded bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1d4ed8] sm:rounded-md sm:px-2.5 sm:py-1 sm:text-[10px]">
            OFERTA
          </span>
        </div>

        {/* Favorite Button */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
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

        {/* Out of Stock */}
        {product.inStock === false && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="bg-[#333333] text-white text-[10px] font-semibold px-2 py-0.5 rounded sm:text-xs sm:px-3">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white p-2 sm:p-3.5">
        {/* Title */}
        <Link href={`/productos/${product.slug}`}>
          <h3 className="line-clamp-2 text-[11px] font-medium leading-snug text-[#0f172a] min-h-[32px] transition-colors hover:text-[#2563eb] sm:text-[13px] sm:min-h-[36px]">
            {product.name}
          </h3>
        </Link>

        {/* Original Price */}
        <p className="mt-1 text-[10px] text-[#94a3b8] line-through sm:mt-2 sm:text-[11px]">
          ${originalPrice.toLocaleString("es-AR")}
        </p>

        {/* Price + OFF */}
        <div className="mt-0.5 flex items-end gap-1 sm:gap-1.5">
          <span className="text-lg leading-none font-semibold text-[#0f172a] sm:text-[24px] md:text-[28px]">
            ${price?.toLocaleString("es-AR")}
          </span>
          <span className="text-[9px] font-semibold text-[#16a34a] mb-0.5 sm:text-[11px]">
            {discount}% OFF
          </span>
        </div>

        {/* Cuotas */}
        <p className="mt-1 text-[10px] text-[#334155] sm:text-[13px]">
          6 cuotas de ${cuota.toLocaleString("es-AR")}
        </p>

        {/* Envío */}
        <p className="text-[10px] font-semibold text-[#16a34a] sm:text-[13px]">
          Llega gratis mañana
        </p>

        {/* Add to Cart Button */}
        <div className="mt-2 border-t border-[#e2e8f0] pt-2 sm:mt-3 sm:pt-3">
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
            className="w-full !rounded-md !bg-[#2563eb] !py-1.5 !text-[11px] !font-semibold !text-white hover:!bg-[#1d4ed8] sm:!rounded-lg sm:!py-2 sm:!text-[13px]"
          />
        </div>
      </div>
    </article>
  );
}
