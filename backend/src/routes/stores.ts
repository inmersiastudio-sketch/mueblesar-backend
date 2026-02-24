import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { stores, products } from "../data/mock.js";

const router = Router();

router.get("/", async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  try {
    // Full-text search: get matching store IDs first
    let matchingIds: number[] | undefined = undefined;
    if (search) {
      try {
        const tsQuery = search.split(/\s+/).filter(Boolean).join(' & ');
        const matches = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "Store"
          WHERE to_tsvector('spanish', COALESCE(name, '') || ' ' || COALESCE(description, ''))
                @@ to_tsquery('spanish', ${tsQuery})
        `;
        matchingIds = matches.map(m => m.id);
      } catch (tsErr) {
        console.warn("Full-text search failed, falling back to ILIKE:", tsErr);
      }
    }

    const whereClause = matchingIds !== undefined
      ? { id: { in: matchingIds } }
      : search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { address: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : undefined;

    const items = await prisma.store.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ items, total: items.length });
  } catch (err) {
    const filtered = search
      ? stores.filter((s) => {
          const haystack = `${s.name} ${s.slug} ${s.description ?? ""} ${s.address ?? ""}`.toLowerCase();
          return haystack.includes(search.toLowerCase());
        })
      : stores;
    return res.json({ items: filtered, total: filtered.length, source: "mock", error: (err as Error).message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: req.params.slug },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
          include: { images: true },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    return res.json({ store, products: store.products });
  } catch (err) {
    const store = stores.find((s) => s.slug === req.params.slug);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    const storeProducts = products.filter((p) => p.storeId === store.id);
    return res.json({ store, products: storeProducts, source: "mock", error: (err as Error).message });
  }
});

export default router;
