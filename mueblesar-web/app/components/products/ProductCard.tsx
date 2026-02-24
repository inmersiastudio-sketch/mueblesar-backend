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
  description?: string;
  category?: string;
  room?: string;
  style?: string;
  imageUrl?: string;
  arUrl?: string;
  images?: { url: string }[];
  store?: { name?: string; slug?: string };
};

type Props = {
  product: ProductCardData;
};

export function ProductCard({ product }: Props) {
  const image = product.images?.[0]?.url ?? product.imageUrl;
  const price = typeof product.price === "string" ? Number(product.price) : product.price;

  const track = (name: string, props?: Record<string, unknown>) => {
    try {
      window.dispatchEvent(new CustomEvent("ar-event", { detail: { name, props } }));
    } catch (e) {
      // ignore
    }
    console.info("[analytics]", name, props ?? {});
  };

  return (
    <Link
      href={`/productos/${product.slug}`}
      onClick={() => track("card_click", { slug: product.slug, hasAr: Boolean(product.arUrl), store: product.store?.slug })}
      className="group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="absolute right-3 top-3 z-10 flex gap-2">
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

      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin imagen</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-600">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{product.category ?? "Categoría"}</span>
        {product.style && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{product.style}</span>}
        {product.store?.name && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{product.store.name}</span>}
        {product.arUrl && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">AR disponible</span>}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
      <p className="line-clamp-2 text-sm text-slate-700">{product.description}</p>
      <div className="flex items-center justify-between pt-2 text-base font-semibold text-primary">
        ${price?.toLocaleString("es-AR")}
        <span className="text-xs uppercase text-slate-500">{product.room ?? ""}</span>
      </div>
    </Link>
  );
}
