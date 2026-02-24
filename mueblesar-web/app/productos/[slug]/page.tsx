import { notFound } from "next/navigation";
import Link from "next/link";
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

  return (
    <div className="py-10">
      <Container>
        <PDPViewTracker
          slug={product.slug}
          store={store?.slug}
          hasAr={Boolean(product.arUrl)}
          hasUsdz={Boolean(product.arUrl?.toLowerCase().endsWith(".usdz"))}
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
          />

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-600">{product.category}</p>
              <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
              <div className="text-lg font-semibold text-primary">{formatPrice(product.price)}</div>
              {/* stock indicator */}
              {product.inStock === false ? (
                <div className="text-sm font-semibold text-red-600">Sin stock</div>
              ) : product.stockQty !== undefined ? (
                <div className="text-sm font-semibold text-green-600">
                  En stock{product.stockQty > 0 ? ` (${product.stockQty})` : ""}
                </div>
              ) : null}
              {product.arUrl && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  AR disponible
                  {product.widthCm && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Escala real</span>}
                </div>
              )}
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
              widthCm={product.widthCm ?? undefined}
              depthCm={product.depthCm ?? undefined}
              heightCm={product.heightCm ?? undefined}
              disabled={!product.inStock}
            />

            {store && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Mueblería</div>
                <div className="text-base font-semibold text-slate-900">{store.name}</div>
                <div className="text-sm text-slate-600">{store.address ?? "Dirección no informada"}</div>
                <Link href={`/mueblerias/${store.slug}`} className="text-sm font-semibold text-primary">
                  Ver más productos
                </Link>
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
