import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { products } from "../data/mock.js";

const router = Router();

const booleanLike = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal(1), z.literal(0)]).transform((v) => {
  if (v === true || v === "true" || v === 1) return true;
  return false;
});

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  store: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(12),
  sort: z.enum(["price", "createdAt"]).optional().default("createdAt"),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
  arOnly: booleanLike.optional().default(false),
});

router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid filters", details: parsed.error.flatten() });
  }

  const { page, pageSize, sort, direction, arOnly, ...filters } = parsed.data;
  const search = filters.q?.trim();
  try {
    // Full-text search: get matching product IDs first
    let matchingIds: number[] | undefined = undefined;
    if (search) {
      try {
        const tsQuery = search.split(/\s+/).filter(Boolean).join(' & ');
        const matches = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "Product"
          WHERE to_tsvector('spanish', COALESCE(name, '') || ' ' || COALESCE(description, ''))
                @@ to_tsquery('spanish', ${tsQuery})
        `;
        matchingIds = matches.map(m => m.id);
      } catch (tsErr) {
        // Fallback to ILIKE if FTS fails
        console.warn("Full-text search failed, falling back to ILIKE:", tsErr);
      }
    }

    const baseWhere = {
      category: filters.category,
      room: filters.room,
      style: filters.style,
      storeId: filters.store ? Number(filters.store) : undefined,
      price: {
        gte: filters.priceMin,
        lte: filters.priceMax,
      },
      arUrl: arOnly ? { not: null } : undefined,
    };

    const whereClause = matchingIds !== undefined
      ? { ...baseWhere, id: { in: matchingIds } }
      : search
        ? {
            ...baseWhere,
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { category: { contains: search, mode: "insensitive" as const } },
              { style: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : baseWhere;

    const [itemsRaw, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          store: {
            select: { id: true, name: true, slug: true, logoUrl: true, whatsapp: true, address: true },
          },
          images: { select: { url: true, position: true } },
        },
        orderBy: { [sort]: direction },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ]);
    const items = itemsRaw.map((p) => ({
      ...p,
      imageUrl: p.imageUrl ?? p.images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null,
    }));
    return res.json({ items, total, page, pageSize });
  } catch (err) {
    // Fallback to mock data if DB is not reachable
    const filtered = products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.room && p.room !== filters.room) return false;
      if (filters.style && p.style !== filters.style) return false;
      if (filters.store && String(p.storeId) !== filters.store) return false;
      if (filters.priceMin !== undefined && p.price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && p.price > filters.priceMax) return false;
      if (arOnly && !p.arUrl) return false;
      if (search) {
        const haystack = `${p.name} ${p.description ?? ""} ${p.category ?? ""} ${p.style ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return res.json({ items: paginated, total: filtered.length, page, pageSize, source: "mock", error: (err as Error).message });
  }
});

router.get("/:idOrSlug", async (req, res) => {
  const param = req.params.idOrSlug;
  const numericId = Number(param);

  const byId = !Number.isNaN(numericId) ? { id: numericId } : undefined;
  const bySlug = Number.isNaN(numericId) ? { slug: param } : undefined;

  try {
    const product = await prisma.product.findUnique({
      where: byId ?? bySlug ?? undefined,
      include: {
        store: {
          select: { id: true, name: true, slug: true, logoUrl: true, whatsapp: true, address: true },
        },
        images: true,
      },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(product);
  } catch (err) {
    const product = byId
      ? products.find((p) => p.id === numericId)
      : products.find((p) => p.slug === param);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json({ ...product, source: "mock", error: (err as Error).message });
  }
});

export default router;
