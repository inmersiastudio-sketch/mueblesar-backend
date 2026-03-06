import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { products } from "../data/mock.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { Errors } from "../errors/AppError.js";

/**
 * Products Public Routes
 * Clean routing layer with consolidated glbUrl/usdzUrl fields
 */

const router = Router();

const booleanLike = z.union([
  z.boolean(),
  z.literal("true"),
  z.literal("false"),
  z.literal(1),
  z.literal(0),
]).transform((v) => v === true || v === "true" || v === 1);

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

// GET /api/products - List products with filtering
router.get("/", asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw Errors.validation("Invalid filters", parsed.error.flatten());
  }

  const { page, pageSize, sort, direction, arOnly, ...filters } = parsed.data;
  const search = filters.q?.trim();

  // Full-text search: get matching product IDs first
  let matchingIds: number[] | undefined;
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
      console.warn("Full-text search failed, falling back to ILIKE:", tsErr);
    }
  }

  // Build where clause - use glbUrl OR arUrl for backward compat during transition
  const baseWhere = {
    category: filters.category,
    room: filters.room,
    style: filters.style,
    storeId: filters.store ? Number(filters.store) : undefined,
    price: {
      gte: filters.priceMin,
      lte: filters.priceMax,
    },
    // Check for AR models - prefer glbUrl, fallback to arUrl during transition
    ...(arOnly ? {
      OR: [
        { glbUrl: { not: null } },
        { arUrl: { not: null } },
      ],
    } : {}),
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
    prisma.product.count({ where: whereClause }),
  ]);

  const items = itemsRaw.map((p) => ({
    ...p,
    // Consolidated AR URLs - prefer new fields, fallback to old during transition
    glbUrl: p.glbUrl || p.arUrl,
    imageUrl: p.imageUrl ?? p.images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null,
  }));

  res.json({ items, total, page, pageSize });
}));

// GET /api/products/:idOrSlug - Get single product
router.get("/:idOrSlug", asyncHandler(async (req, res) => {
  const param = req.params.idOrSlug;
  const numericId = Number(param);

  const byId = !Number.isNaN(numericId) ? { id: numericId } : undefined;
  const bySlug = Number.isNaN(numericId) ? { slug: param } : undefined;

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
    throw Errors.notFound("Product");
  }

  // Consolidate AR URLs for response
  const enrichedProduct = {
    ...product,
    glbUrl: product.glbUrl || product.arUrl,
  };

  res.json(enrichedProduct);
}));

export default router;
