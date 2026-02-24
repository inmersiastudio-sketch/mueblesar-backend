import Link from "next/link";
import { Container } from "../components/layout/Container";
import { fetchStores } from "../lib/api";

export default async function StoresPage() {
  const { items } = await fetchStores();

  return (
    <div className="py-10">
      <Container>
        <div className="flex flex-col gap-2 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Mueblerías</p>
          <h1 className="text-3xl font-bold text-slate-900">Todas las mueblerías</h1>
          <p className="text-sm text-slate-600">Listado de mueblerías conectadas.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
              Sin mueblerías aún. Agrega registros en la base o corre el seed.
            </div>
          )}
          {items.map((store) => (
            <div
              key={store.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <Link href={`/mueblerias/${store.slug}`} className="block">
                <div className="text-lg font-semibold text-slate-900">{store.name}</div>
                <p className="text-sm text-slate-700">{store.description ?? "Mueblería local"}</p>
              </Link>
              <div className="pt-2 text-xs text-slate-500">
                WhatsApp: {store.whatsapp ? (
                  <a
                    href={`https://wa.me/${store.whatsapp}`}
                    className="font-semibold text-primary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {store.whatsapp}
                  </a>
                ) : (
                  "N/D"
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
