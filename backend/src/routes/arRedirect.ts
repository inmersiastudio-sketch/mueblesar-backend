import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { Errors } from "../errors/AppError.js";

/**
 * AR Redirect Routes
 * Short URLs for AR viewer: /api/ar/{productId}
 * Redirects to AR page with model URLs
 */

const router = Router();

// GET /api/short/ar/:productId - Redirect to AR viewer
router.get("/:productId", asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  
  if (Number.isNaN(productId)) {
    throw Errors.validation("Invalid product ID");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, arUrl: true, glbUrl: true, usdzUrl: true },
  });

  if (!product || (!product.glbUrl && !product.arUrl)) {
    throw Errors.notFound("Product or AR model");
  }

  // Consolidate AR URLs - prefer glbUrl, fallback to arUrl during transition
  const glbUrl = product.glbUrl || product.arUrl;
  const usdzUrl = product.usdzUrl || null;

  // Redirect to the AR page with clean params
  const siteUrl = env.SITE_URL || "http://localhost:3000";
  const redirectUrl = new URL(`${siteUrl}/ar`);
  redirectUrl.searchParams.set("glb", glbUrl);

  // Sanitize product name to prevent XSS
  redirectUrl.searchParams.set("title", encodeURIComponent(product.name));

  if (usdzUrl) redirectUrl.searchParams.set("usdz", usdzUrl);

  res.redirect(redirectUrl.toString());
}));

export default router;
