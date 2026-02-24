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
  stockQty: z.number().optional(),
  images: z.array(z.object({ url: z.string().url(), type: z.string().optional() })).optional(),
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


// helper to insert a change log
async function logChange(productId: number, userId: number | null, action: string, data?: any) {
  try {
    // @ts-ignore: model added via migration
    await (prisma as any).productLog.create({
      data: { productId, userId: userId ?? undefined, action, data: data ?? undefined },
    });
  } catch (e) {
    console.error("failed to insert product log", e);
  }
}

function summarizeDiff(before: Record<string, any> | null, after: Record<string, any> | null) {
  if (!before || !after) return [] as string[];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (String(b ?? "") !== String(a ?? "")) {
      changed.push(key);
    }
  }
  return changed;
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
    // cast to any since Prisma types are complex and we just validated via zod
    const data: any = { ...parsed.data };
    const imgs = data.images;
    delete data.images;
    if (user.role === Role.STORE && user.storeId) {
      data.storeId = user.storeId;
    }

    const validation = await maybeValidateScale(data, tolerance);
    if (validation && !validation.result.ok) {
      return res.status(400).json({ error: "Scale validation failed", validation });
    }
    const product = await prisma.product.create({ data: data as any });
    await logChange(product.id, user.id, "create", {
      summary: `Producto creado: ${product.name}`,
      payload: data,
    });
    // handle images separately if provided
    if (imgs && imgs.length) {
      await prisma.productImage.createMany({
        data: imgs.map((img: any) => ({
          productId: product.id,
          url: img.url,
          type: img.type || undefined,
          position: undefined,
        })),
      });
    }
    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ error: "Cannot create product", detail: (err as Error).message });
  }
});

router.post("/bulk", async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  if (!ensureStoreUserHasStore(user)) return res.status(400).json({ error: "Store user without store assigned" });

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Payload must be an array of products" });
  }

  const items = req.body;
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    // We use an interactive transaction to ensure all-or-nothing or just faster sequential processing
    // NOTE: If one fails, the whole transaction rolls back. 
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          if (item.id) {
            // Update
            const parsed = updateSchema.safeParse(item);
            if (!parsed.success) throw new Error(parsed.error.errors[0].message);
            const { id: productId, ...data } = parsed.data;
            if (user.role === Role.STORE && user.storeId) {
              const existing = await tx.product.findUnique({ where: { id: productId }, select: { storeId: true } });
              if (!existing || existing.storeId !== user.storeId) throw new Error("Forbidden or not found");
              (data as any).storeId = user.storeId;
            }

            const imgs = (data as any).images;
            delete (data as any).images;

            const previous = await tx.product.findUnique({ where: { id: productId } });
            // @ts-ignore
            const product = await tx.product.update({ where: { id: productId }, data: data as any });

            if (imgs) {
              await tx.productImage.deleteMany({ where: { productId } });
              if (imgs.length) {
                await tx.productImage.createMany({
                  data: imgs.map((img: any) => ({ productId, url: img.url, type: img.type || undefined })),
                });
              }
            }

            // @ts-ignore
            await (tx as any).productLog.create({
              data: { productId, userId: user.id, action: "update", data: { summary: "Actualizado via Bulk" } },
            });
            updated++;
          } else {
            // Create
            const parsed = createSchema.safeParse(item);
            if (!parsed.success) throw new Error(parsed.error.errors[0].message);
            const data = { ...parsed.data };
            if (user.role === Role.STORE && user.storeId) {
              data.storeId = user.storeId;
            }
            const imgs = (data as any).images;
            delete (data as any).images;

            // @ts-ignore
            const product = await tx.product.create({ data: data as any });
            if (imgs && imgs.length) {
              await tx.productImage.createMany({
                data: imgs.map((img: any) => ({ productId: product.id, url: img.url, type: img.type || undefined })),
              });
            }
            // @ts-ignore
            await (tx as any).productLog.create({
              data: { productId: product.id, userId: user.id, action: "create", data: { summary: "Creado via Bulk" } },
            });
            created++;
          }
        } catch (err) {
          throw new Error(`Fila ${i + 2}: ${(err as Error).message}`);
        }
      }
    });

    return res.json({ success: true, created, updated });
  } catch (err) {
    return res.status(400).json({ error: "Bulk import failed", detail: (err as Error).message });
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
  const payload = parsed.data as any;
  const imgs = payload.images;
  delete payload.images;
  const { id: productId, ...data } = payload;
  const tolerance = Number(req.query.tolerance ?? 0.05) || 0.05;
  try {
    if (!ensureStoreUserHasStore(user)) return res.status(400).json({ error: "Store user without store assigned" });
    if (user.role === Role.STORE && user.storeId) {
      const existing = await prisma.product.findUnique({ where: { id: productId }, select: { storeId: true } });
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.storeId !== user.storeId) return res.status(403).json({ error: "Forbidden" });
      (data as { storeId?: number }).storeId = user.storeId;
    }

    const previous = await prisma.product.findUnique({ where: { id: productId } });
    const validation = await maybeValidateScale(data, tolerance);
    console.log("[PUT /products/:id] Scale validation result:", validation ? JSON.stringify(validation, null, 2) : "null");
    if (validation && !validation.result.ok) {
      console.log("[PUT /products/:id] Scale validation FAILED, returning 400");
      return res.status(400).json({ error: "Scale validation failed", validation });
    }
    // @ts-ignore - data typed loosely
    const product = await prisma.product.update({ where: { id: productId }, data: data as any });
    const changedFields = summarizeDiff(previous as any, product as any);
    await logChange(productId, user.id, "update", {
      summary: `Actualización de ${changedFields.length} campo(s)`,
      changedFields,
      patch: data,
    });
    if (imgs) {
      // replace images
      // @ts-ignore - ignore type mismatches
      await prisma.productImage.deleteMany({ where: { productId } });
      if (imgs.length) {
        // @ts-ignore - ignore type mismatches
        await prisma.productImage.createMany({
          data: imgs.map((img: any) => ({
            productId,
            url: img.url,
            type: img.type || undefined,
            position: undefined,
          })),
        });
      }
    }
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
    const previous = await prisma.product.findUnique({ where: { id } });
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.arView.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    await logChange(id, user.id, "delete", {
      summary: "Producto eliminado",
      previous,
    });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Cannot delete product", detail: (err as Error).message });
  }
});

// fetch change log for product
router.get("/:id/logs", async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    if (user.role === Role.STORE && user.storeId) {
      const existing = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.storeId !== user.storeId) return res.status(403).json({ error: "Forbidden" });
    }

    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
    const where: any = { productId: id };
    if (action) where.action = action;
    if (from || to) where.createdAt = { gte: from, lte: to };

    // @ts-ignore: model added via migration
    const logs = await (prisma as any).productLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const userIds = Array.from(new Set(logs.map((l: any) => l.userId).filter(Boolean)));
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds as number[] } }, select: { id: true, email: true, name: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const hydrated = logs.map((entry: any) => {
      const u = entry.userId ? byId.get(entry.userId) : null;
      let parsedData: any = entry.data;
      if (typeof parsedData === "string") {
        try {
          parsedData = JSON.parse(parsedData);
        } catch {
          parsedData = { raw: entry.data };
        }
      }
      return {
        ...entry,
        data: parsedData,
        userEmail: u?.email ?? null,
        userName: u?.name ?? null,
        actor: u?.name || u?.email || "desconocido",
      };
    });

    return res.json(hydrated);
  } catch (err) {
    return res.status(500).json({ error: "Cannot fetch logs", detail: (err as Error).message });
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
        images: { select: { url: true, position: true, type: true } },
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
