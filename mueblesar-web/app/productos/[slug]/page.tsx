import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/layout/Container";
import { ImageCarousel } from "../../components/media/ImageCarousel";
import { FavoriteButton } from "../../components/favorites/FavoriteButton";
import { fetchProductBySlug } from "../../lib/api";
import { PDPCTA } from "../../components/products/PDPCTA";
import { PDPViewTracker } from "../../components/products/PDPViewTracker";

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
  const message = encodeURIComponent(
    `Hola! Me interesa el ${product.name} que vi en MueblesAR. Precio: ${formatPrice(product.price)}. Está disponible?`
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
        <div className="pb-4 text-sm text-primary">
          <Link href="/productos">← Volver al catálogo</Link>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <ImageCarousel images={images} alt={product.name} />

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-600">{product.category}</p>
              <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
              <div className="text-lg font-semibold text-primary">{formatPrice(product.price)}</div>
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

            <p className="text-sm text-slate-700">{product.description}</p>

            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-800">Estilo</div>
                <div>{product.style}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-800">Ambiente</div>
                <div>{product.room}</div>
              </div>
              {product.widthCm && (
                <div>
                  <div className="font-semibold text-slate-800">Dimensiones</div>
                  <div>
                    {product.widthCm} x {product.depthCm ?? "?"} x {product.heightCm ?? "?"} cm
                  </div>
                </div>
              )}
              {product.material && (
                <div>
                  <div className="font-semibold text-slate-800">Material</div>
                  <div>{product.material}</div>
                </div>
              )}
            </div>

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
          </div>
        </div>
      </Container>
    </div>
  );
}
