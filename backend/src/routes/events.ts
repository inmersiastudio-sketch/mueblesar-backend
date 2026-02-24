import express from "express";
import { ArSource } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const arViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many AR events, slow down",
});

router.post("/ar-view", arViewLimiter, async (req, res) => {
  const { productId, slug, source } = req.body || {};

  if (!productId && !slug) {
    return res.status(400).json({ error: "productId or slug required" });
  }

  try {
    const product = await prisma.product.findFirst({
      where: productId ? { id: Number(productId) } : { slug },
      select: { id: true, storeId: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const src: ArSource = (source?.toString().toUpperCase() as ArSource) ?? ArSource.UNKNOWN;

    await prisma.arView.create({
      data: {
        productId: product.id,
        storeId: product.storeId,
        source: Object.values(ArSource).includes(src) ? src : ArSource.UNKNOWN,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("ar-view error", err);
    res.status(500).json({ error: "Cannot save ar-view" });
  }
});

export default router;