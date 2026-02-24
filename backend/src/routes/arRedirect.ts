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
      select: { id: true, name: true, arUrl: true },
    });

    if (!product || !product.arUrl) {
      return res.status(404).send("Product or AR model not found");
    }

    // For Scene Viewer, use DIRECT Meshy URL (Google servers can access it)
    // No proxy needed because Scene Viewer downloads server-side, not client-side
    const arUrl = product.arUrl;

    // Redirect to the AR page with clean params
    const siteUrl = env.SITE_URL || "http://localhost:3000";
    const redirectUrl = new URL(`${siteUrl}/ar`);
    redirectUrl.searchParams.set("glb", arUrl); // Direct URL for Scene Viewer
    redirectUrl.searchParams.set("title", product.name);

    const finalUrl = redirectUrl.toString();
    console.log(`[AR Redirect] Product ${productId} (${product.name})`);
    console.log(`[AR Redirect] AR URL: ${arUrl}`);
    console.log(`[AR Redirect] Redirect to: ${finalUrl}`);

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("AR redirect error:", err);
    return res.status(500).send("Error redirecting to AR");
  }
});

export default router;
