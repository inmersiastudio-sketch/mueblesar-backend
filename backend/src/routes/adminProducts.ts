import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { validateGlbScale } from "../lib/scaleValidator.js";
import { AuthenticatedRequest, requireAuth, requireRole } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireRole([Role.ADMIN, Role.STORE]));

const baseSchema = {
  storeId: z.number(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  depthCm: z.number().optional(),
  weightKg: z.number().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  arUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  imageUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  inStock: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({ id: z.number(), ...Object.fromEntries(Object.entries(baseSchema).map(([k, v]) => [k, v.optional()])) });

type Suggestion = {
  dimension: "width" | "depth" | "height";
  factor: number;
  projectedSizeCm: { width: number; depth: number; height: number };
  projectedDiffs: { width: number | null; depth: number | null; height: number | null };
};

function ensureStoreUserHasStore(user: { role: Role; storeId?: number | null }) {
  return !(user.role === Role.STORE && !user.storeId);
}

function computeSuggestion(
  sizeCm: { width: number; depth: number; height: number },
  expected: { width?: number; depth?: number; height?: number },
): Suggestion | null {
  const priority: Array<"width" | "depth" | "height"> = ["width", "depth", "height"];
  const picked = priority.find((key) => expected[key] !== undefined);
  if (!picked) return null;
  const actual = sizeCm[picked];
  const target = expected[picked]!;
  if (!actual || actual === 0) return null;
  const factor = target / actual;
  const projectedSizeCm = {
    width: Math.round(sizeCm.width * factor * 10) / 10,
    depth: Math.round(sizeCm.depth * factor * 10) / 10,
    height: Math.round(sizeCm.height * factor * 10) / 10,
  };
  const projectedDiffs = {
    width: expected.width ? Math.abs(projectedSizeCm.width - expected.width) / expected.width : null,
    depth: expected.depth ? Math.abs(projectedSizeCm.depth - expected.depth) / expected.depth : null,
    height: expected.height ? Math.abs(projectedSizeCm.height - expected.height) / expected.height : null,
  };
  return { dimension: picked, factor, projectedSizeCm, projectedDiffs };
}

async function maybeValidateScale(
  payload: { arUrl?: string; widthCm?: number; depthCm?: number; heightCm?: number },
  tolerance: number,
) {
  if (!payload.arUrl) return null;
  if (!payload.widthCm && !payload.depthCm && !payload.heightCm) return null;
  const result = await validateGlbScale({
    file: payload.arUrl,
    width: payload.widthCm,
    depth: payload.depthCm,
    height: payload.heightCm,
    tolerance,
  });
  const suggestion = computeSuggestion(result.sizeCm, result.expected);
  return { result, suggestion };
}

router.post("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const tolerance = Number(req.query.tolerance ?? 0.05) || 0.05;
  try {
    if (!ensureStoreUserHasStore(user)) return res.status(400).json({ error: "Store user without store assigned" });
    const data = { ...parsed.data };
    if (user.role === Role.STORE && user.storeId) {
      data.storeId = user.storeId;
    }

    const validation = await maybeValidateScale(data, tolerance);
    if (validation && !validation.result.ok) {
      return res.status(400).json({ error: "Scale validation failed", validation });
    }
    const product = await prisma.product.create({ data });
    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ error: "Cannot create product", detail: (err as Error).message });
  }
});

router.put("/:id", async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const id = Number(req.params.id);
  console.log("[PUT /products/:id] Request body:", JSON.stringify(req.body, null, 2));
  const parsed = updateSchema.safeParse({ id, ...req.body });
  if (!parsed.success) {
    console.log("[PUT /products/:id] Validation error:", JSON.stringify(parsed.error.flatten(), null, 2));
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }
  const { id: productId, ...data } = parsed.data;
  const tolerance = Number(req.query.tolerance ?? 0.05) || 0.05;
  try {
    if (!ensureStoreUserHasStore(user)) return res.status(400).json({ error: "Store user without store assigned" });
    if (user.role === Role.STORE && user.storeId) {
      const existing = await prisma.product.findUnique({ where: { id: productId }, select: { storeId: true } });
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.storeId !== user.storeId) return res.status(403).json({ error: "Forbidden" });
      (data as { storeId?: number }).storeId = user.storeId;
    }

    const validation = await maybeValidateScale(data, tolerance);
    console.log("[PUT /products/:id] Scale validation result:", validation ? JSON.stringify(validation, null, 2) : "null");
    if (validation && !validation.result.ok) {
      console.log("[PUT /products/:id] Scale validation FAILED, returning 400");
      return res.status(400).json({ error: "Scale validation failed", validation });
    }
    const product = await prisma.product.update({ where: { id: productId }, data });
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: "Cannot update product", detail: (err as Error).message });
  }
});

router.delete("/:id", async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    if (!ensureStoreUserHasStore(user)) return res.status(400).json({ error: "Store user without store assigned" });
    if (user.role === Role.STORE && user.storeId) {
      const existing = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.storeId !== user.storeId) return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.arView.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Cannot delete product", detail: (err as Error).message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const user = (_req as AuthenticatedRequest).user!;
    const where = user.role === Role.STORE && user.storeId ? { storeId: user.storeId } : undefined;
    const items = await prisma.product.findMany({
      where,
      include: {
        store: true,
        images: { select: { url: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const mapped = items.map((p: typeof items[number]) => ({
      ...p,
      imageUrl: p.imageUrl ?? p.images.sort((a: { position: number | null }, b: { position: number | null }) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null,
    }));
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: "Cannot list products", detail: (err as Error).message });
  }
});

export default router;
