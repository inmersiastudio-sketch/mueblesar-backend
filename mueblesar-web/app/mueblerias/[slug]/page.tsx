import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "../../components/layout/Container";
import { ProductCard } from "../../components/products/ProductCard";
import { fetchStoreBySlug } from "../../lib/api";

export default async function StoreDetail({ params }: { params: { slug: string } }) {
  const data = await fetchStoreBySlug(params.slug);
  if (!data || !data.store) return notFound();

  const { store, products } = data;

  return (
    <div className="py-10">
      <Container>
        <div className="flex flex-col gap-2 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Mueblería</p>
          <h1 className="text-3xl font-bold text-slate-900">{store.name}</h1>
          <p className="text-sm text-slate-600">{store.address ?? "Dirección no informada"}</p>
          <div className="text-sm text-slate-600">
            WhatsApp: {store.whatsapp ? (
              <a href={`https://wa.me/${store.whatsapp}`} className="font-semibold text-primary" target="_blank" rel="noreferrer">
                {store.whatsapp}
              </a>
            ) : (
              "N/D"
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
              Esta mueblería aún no tiene productos cargados.
            </div>
          )}
          {products.map((product) => (
            <ProductCard key={product.id} product={{ ...product, store }} />
          ))}
        </div>
      </Container>
    </div>
  );
}
