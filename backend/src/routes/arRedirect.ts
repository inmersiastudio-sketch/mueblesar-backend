import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

const router = Router();

// Short URL redirect for AR: /api/ar/{productId}
router.get("/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (Number.isNaN(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, arUrl: true, glbUrl: true, usdzUrl: true },
    });

    if (!product || (!product.glbUrl && !product.arUrl)) {
      return res.status(404).send("Product or AR model not found");
    }

    const glbUrl = product.glbUrl || product.arUrl;
    const usdzUrl = product.usdzUrl || null;

    // Redirect to the AR page with clean params
    const siteUrl = env.SITE_URL || "http://localhost:3000";
    const redirectUrl = new URL(`${siteUrl}/ar`);
    redirectUrl.searchParams.set("glb", glbUrl); // Direct URL for Scene Viewer

    // Sanitize product name to prevent XSS (Finding 3 from Code Review)
    redirectUrl.searchParams.set("title", encodeURIComponent(product.name));

    if (usdzUrl) redirectUrl.searchParams.set("usdz", usdzUrl);

    const finalUrl = redirectUrl.toString();

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("AR redirect error:", err);
    return res.status(500).send("Error redirecting to AR");
  }
});

export default router;
