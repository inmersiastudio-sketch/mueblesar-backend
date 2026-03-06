import { notFound } from "next/navigation";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/layout/Container";
import { ImageCarousel } from "../../components/media/ImageCarousel";
import { ColorImageCarousel } from "../../components/media/ColorImageCarousel";
import { FavoriteButton } from "../../components/favorites/FavoriteButton";
import { fetchProductBySlug, fetchProducts } from "../../lib/api";
import { PDPCTA } from "../../components/products/PDPCTA";
import { PDPViewTracker } from "../../components/products/PDPViewTracker";
import { ProductCard } from "../../components/products/ProductCard";
import { ProductInfoTabs } from "../../components/products/ProductInfoTabs";

function formatPrice(value: number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `$${(num ?? 0).toLocaleString("es-AR")}`;
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return notFound();

  const images = product.images && product.images.length > 0 ? product.images.map((img) => img.url) : product.imageUrl ? [product.imageUrl] : [];
  const store = product.store;
  const whatsapp = store?.whatsapp;

  // fetch related products (same category/style or same store)
  const relatedData = await fetchProducts({
    category: product.category || undefined,
    style: product.style || undefined,
    store: store?.id ? String(store.id) : undefined,
    pageSize: 8,
  });
  const related = (relatedData.items || []).filter((p) => p.id !== product.id);
  const message = encodeURIComponent(
    `Hola! Me interesa el ${product.name} que vi en Amobly. Precio: ${formatPrice(product.price)}. Está disponible?`
  );
  const waLink = whatsapp ? `https://wa.me/${whatsapp}?text=${message}` : undefined;
  const arLink = product.arUrl || undefined;
  const glbLink = product.glbUrl || undefined;
  const usdzLink = product.usdzUrl || undefined;

  return (
    <div className="py-10">
      <Container>
        <PDPViewTracker
          slug={product.slug}
          store={store?.slug}
          hasAr={Boolean(product.glbUrl || product.arUrl)}
          hasUsdz={Boolean(product.usdzUrl || product.arUrl?.toLowerCase().endsWith(".usdz"))}
        />
        {/* breadcrumbs */}
        <div className="pb-4 text-sm text-primary">
          <Link href="/">Inicio</Link> /{' '}
          <Link href="/productos">Productos</Link>
          {product.category && (
            <> / <Link href={`/productos?category=${encodeURIComponent(product.category)}`}>{product.category}</Link></>
          )}{' '}
          / <span className="font-semibold text-slate-900">{product.name}</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <ColorImageCarousel
            images={product.images?.length ? product.images : images.map((u) => ({ url: u }))}
            alt={product.name}
            initialColor={product.color ?? undefined}
            arUrl={product.arUrl ?? undefined}
            glbUrl={product.glbUrl ?? undefined}
            usdzUrl={product.usdzUrl ?? undefined}
          />

          <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-1">{product.category}</p>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">{product.name}</h1>
              </div>

              <div className="text-4xl font-extrabold text-[#002f5e] tracking-tight">{formatPrice(product.price)}</div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* stock indicator */}
                {product.inStock === false ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                    Sin stock
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                    En stock {product.stockQty && product.stockQty > 0 ? `(${product.stockQty})` : ""}
                  </div>
                )}

                {product.arUrl && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0058a3]/10 px-3 py-1 text-xs font-bold text-[#0058a3]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2-1m2 1l-2 1m2-1v10l-2 1m-10-11l2-1m-2 1l2 1m-2-1v10l2 1m10-11l-2-1m-6-3l-2 1m2-1l2 1" />
                    </svg>
                    AR disponible
                    {product.widthCm && <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#0058a3] shadow-sm uppercase">Escala real</span>}
                  </div>
                )}
              </div>
              <div className="pt-2">
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
            </div>

            <ProductInfoTabs
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

            <PDPCTA
              productId={product.id}
              storeId={product.storeId ?? undefined}
              productName={product.name}
              productSlug={product.slug}
              productPrice={product.price}
              productImage={images[0]}
              storeName={store?.name}
              storeSlug={store?.slug}
              storeWhatsapp={store?.whatsapp}
              waLink={waLink}
              arLink={arLink}
              glbLink={glbLink}
              usdzLink={usdzLink}
              widthCm={product.widthCm ?? undefined}
              depthCm={product.depthCm ?? undefined}
              heightCm={product.heightCm ?? undefined}
              disabled={!product.inStock}
            />

            {store && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mt-6 flex items-start gap-4 transition-all hover:bg-slate-100 hover:border-slate-300 group">
                <div className="w-12 h-12 rounded-full bg-[#002f5e] flex items-center justify-center shrink-0 shadow-inner">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Vendido por Mueblería Local</div>
                  <div className="text-lg font-bold text-[#002f5e] leading-none mb-1 group-hover:text-[#0058a3] transition-colors">{store.name}</div>
                  <div className="text-sm text-slate-500 mb-3">{store.address ?? "Dirección no informada"}</div>
                  <Link href={`/mueblerias/${store.slug}`} className="inline-flex items-center text-sm font-bold text-[#0058a3] hover:text-[#004f93] bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:shadow transition-all group-hover:border-[#0058a3]/20">
                    Ver todos sus productos &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* related products */}
            {related.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Productos relacionados</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {related.map((p) => {
                    const image = p.images && p.images.length > 0 ? p.images[0].url : p.imageUrl;
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
          </div>
        </div>
      </Container>
    </div>
  );
}
