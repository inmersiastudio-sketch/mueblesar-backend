export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, Truck, Shield, MessageCircle, MapPin, Package } from "lucide-react";
import { Container } from "@/app/components/layout/Container";
import { ColorImageCarousel } from "@/app/components/media/ColorImageCarousel";
import { FavoriteButton } from "@/app/components/favorites/FavoriteButton";
import { fetchProductBySlug, fetchProducts } from "@/app/lib/api";
import { PDPViewTracker } from "@/app/components/products/PDPViewTracker";
import { ProductCard } from "@/app/components/products/ProductCard";
import type { Product } from "@/types";
import { ProductSpecs } from "./ProductSpecs";
import { SellerInfo } from "./SellerInfo";
import { ShippingCalculator } from "./ShippingCalculator";
import { ProductActions } from "./ProductActions";

function formatPrice(value: number): string {
  return `$${(value ?? 0).toLocaleString("es-AR")}`;
}

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetail({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  
  if (!product) return notFound();

  const images =
    product.images && product.images.length > 0
      ? product.images.map((img: { url: string }) => img.url)
      : product.imageUrl
        ? [product.imageUrl]
        : [];
  
  const store = product.store;
  const whatsapp = store?.whatsapp;

  // Fetch related products
  const relatedData = await fetchProducts({
    category: product.category || undefined,
    style: product.style || undefined,
    store: store?.id ? String(store.id) : undefined,
    pageSize: 4,
  });
  
  const related = (relatedData.items || []).filter((p: Product) => p.id !== product.id);
  
  const message = encodeURIComponent(
    `Hola! Me interesa el ${product.name} que vi en Amobly. Precio: ${formatPrice(product.price)}. Está disponible?`
  );
  
  const waLink = whatsapp ? `https://wa.me/${whatsapp}?text=${message}` : undefined;
  
  // AR URLs
  const arModelUrl = product.glbUrl || product.arUrl;
  const usdzUrl = product.usdzUrl;
  
  // Mock data para el diseño (en producción vendrían de la API)
  const originalPrice = Math.round(product.price * 1.15);
  const rating = 4.8;
  const reviewCount = 128;
  const isNew = true;

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <Container className="py-6">
        <PDPViewTracker
          slug={product.slug}
          store={store?.slug}
          hasAr={Boolean(arModelUrl)}
          hasUsdz={Boolean(usdzUrl)}
        />
        
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-[#64748b]">
          <Link href="/" className="hover:text-[#1d4ed8]">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/productos" className="hover:text-[#1d4ed8]">Productos</Link>
          {product.category && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/productos?category=${encodeURIComponent(product.category)}`} className="hover:text-[#1d4ed8]">
                {product.category}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="font-medium text-[#0f172a]">{product.name}</span>
        </nav>

        {/* Main Product Layout */}
        <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-2">
          {/* Left Column - Images */}
          <div className="flex flex-col">
            <ColorImageCarousel
              images={product.images?.length ? product.images : images.map((u: string) => ({ url: u }))}
              alt={product.name}
              initialColor={product.color ?? undefined}
              arUrl={product.arUrl ?? undefined}
              glbUrl={product.glbUrl ?? undefined}
              usdzUrl={product.usdzUrl ?? undefined}
            />
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            {/* Badge, Rating & Favorite */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isNew && (
                  <span className="inline-flex items-center rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                    Nuevo
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-[#64748b]">({reviewCount} reseñas)</span>
                </div>
              </div>
              
              {/* Favorite Button - Al lado del rating */}
              <FavoriteButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  imageUrl: images[0],
                  category: product.category,
                  room: product.room,
                  style: product.style,
                  description: product.description,
                  storeName: store?.name,
                  storeSlug: store?.slug,
                }}
              />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#0f172a] md:text-3xl">
                {product.name}
              </h1>
              <p className="mt-1.5 text-[15px] text-[#64748b]">{product.description?.substring(0, 120)}...</p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#0f172a] md:text-4xl">
                {formatPrice(product.price)}
              </span>
              <span className="text-xl text-[#94a3b8] line-through">
                {formatPrice(originalPrice)}
              </span>
            </div>

            {/* AR Section */}
            {arModelUrl && (
              <div className="rounded-xl border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] to-[#f8fafc] p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-[#0f172a]">
                      <span className="text-[#1d4ed8]">✦</span> Realidad Aumentada
                    </h3>
                    <p className="mt-1 text-sm text-[#64748b]">Probá como queda en tu ambiente ahora mismo</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <ProductActions
              productId={product.id}
              storeId={product.storeId ?? null}
              productName={product.name}
              productSlug={product.slug}
              productPrice={product.price}
              productImage={images[0]}
              storeName={store?.name}
              storeSlug={store?.slug}
              storeWhatsapp={store?.whatsapp}
              waLink={waLink}
              arLink={arModelUrl ?? undefined}
              glbLink={product.glbUrl ?? undefined}
              usdzLink={product.usdzUrl ?? undefined}
              widthCm={product.widthCm ?? undefined}
              depthCm={product.depthCm ?? undefined}
              heightCm={product.heightCm ?? undefined}
              disabled={!product.inStock}
            />

            {/* Financing Options */}
            <div className="flex items-center gap-4 text-sm">
              <button className="flex items-center gap-2 text-[#64748b] transition-colors hover:text-[#1d4ed8]">
                <Shield className="w-4 h-4" />
                <span>Opciones de financiación</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3">
              <div className="text-center">
                <Truck className="mx-auto mb-1 h-5 w-5 text-[#1d4ed8]" />
                <p className="text-[11px] text-[#334155]">Envío Gratis</p>
                <p className="text-[10px] text-[#94a3b8]">CABA y GBA</p>
              </div>
              <div className="text-center">
                <Shield className="mx-auto mb-1 h-5 w-5 text-[#1d4ed8]" />
                <p className="text-[11px] text-[#334155]">Garantía</p>
                <p className="text-[10px] text-[#94a3b8]">12 meses oficial</p>
              </div>
              <div className="text-center">
                <Package className="mx-auto mb-1 h-5 w-5 text-[#1d4ed8]" />
                <p className="text-[11px] text-[#334155]">Stock</p>
                <p className="text-[10px] text-[#94a3b8]">
                  {product.inStock ? 'Disponible' : 'Agotado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs & Seller Info Grid */}
        <div className="mx-auto mt-10 grid max-w-[1400px] gap-6 lg:grid-cols-3">
          {/* Specs - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ProductSpecs
              description={product.description}
              category={product.category}
              room={product.room}
              style={product.style}
              material={product.material}
              color={product.color}
              widthCm={product.widthCm ?? undefined}
              depthCm={product.depthCm ?? undefined}
              heightCm={product.heightCm ?? undefined}
              weightKg={product.weightKg ?? undefined}
            />
          </div>

          {/* Sidebar - Seller & Shipping */}
          <div className="space-y-6">
            {/* Seller Info */}
            {store && (
              <SellerInfo
                store={store}
                rating={4.9}
                salesCount={250}
                responseTime="< 1 hora"
              />
            )}

            {/* Shipping Calculator */}
            <ShippingCalculator />

            {/* WhatsApp CTA */}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-6 py-3 text-center font-bold text-white transition-colors hover:bg-[#16a34a]"
              >
                <MessageCircle className="w-5 h-5" />
                Consultar por WhatsApp
              </a>
            )}

            {/* Showroom */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#0f172a]">
                <MapPin className="w-5 h-5 text-[#1d4ed8]" />
                Showroom
              </h3>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-[#f8fafc]">
                <div className="absolute inset-0 flex items-center justify-center text-[#94a3b8]">
                  <div className="text-center">
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-[#1d4ed8]" />
                    <span className="text-sm">{store?.address || "Córdoba, Argentina"}</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#64748b]">Visitá nuestro showroom para ver el producto en persona</p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mx-auto mt-14 max-w-[1500px]">
            <h2 className="mb-6 text-2xl font-bold text-[#0f172a]">Productos relacionados</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p: Product) => {
                const image =
                  p.images && p.images.length > 0 ? p.images[0].url : p.imageUrl;
                return (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      slug: p.slug,
                      name: p.name,
                      price: p.price,
                      description: p.description,
                      category: p.category,
                      room: p.room,
                      style: p.style,
                      imageUrl: image,
                      arUrl: p.arUrl,
                      images: p.images,
                      store: { name: p.store?.name, slug: p.store?.slug },
                      color: p.color,
                      inStock: p.inStock,
                      stockQty: p.stockQty,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
