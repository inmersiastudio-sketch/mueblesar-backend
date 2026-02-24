import { Router } from "express";
import { requireRole, AuthenticatedRequest } from "../lib/auth.js";
import { createImageTo3DTask, getTaskStatus, downloadGLB } from "../lib/meshy.js";
import { uploadGLB } from "../lib/cloudinary.js";
import { validateGLBScale } from "../lib/glb-validator.js";
import { compressGLB, getFileSizeInfo } from "../lib/glb-compressor.js";
import { prisma } from "../lib/prisma.js";
import { Role } from "@prisma/client";

const router = Router();

/**
 * POST /api/admin/ai-3d/generate
 * Create a new 3D generation job from product image
 */
router.post("/generate", requireRole([Role.ADMIN, Role.STORE]), async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, imageUrl } = req.body;

    if (!productId || !imageUrl) {
      return res.status(400).json({ error: "productId and imageUrl are required" });
    }

    // Verify product exists and user has access
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { store: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If user is STORE role, check they own this product
    if (req.user?.role === Role.STORE && product.storeId !== req.user.storeId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create AI3DJob record
    const job = await (prisma as any).aI3DJob.create({
      data: {
        productId: product.id,
        imageUrl,
        provider: "meshy",
        status: "PENDING",
      },
    });

    // Start Meshy task (async)
    try {
      const taskId = await createImageTo3DTask({
        imageUrl,
        enablePbr: true,
        aiModel: "latest",
      });

      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          taskId,
          status: "IN_PROGRESS",
        },
      });

      return res.json({
        success: true,
        jobId: job.id,
        taskId,
        message: "3D generation started. Check status with GET /api/admin/ai-3d/jobs/:id/status",
      });
    } catch (error) {
      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMsg: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  } catch (error) {
    console.error("AI 3D generation error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start 3D generation" });
  }
});

/**
 * GET /api/admin/ai-3d/jobs/:jobId/status
 * Check status of a 3D generation job
 */
router.get("/jobs/:jobId/status", requireRole([Role.ADMIN, Role.STORE]), async (req: AuthenticatedRequest, res) => {
  try {
    const jobId = Number(req.params.jobId);

    const job = await (prisma as any).aI3DJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check access for STORE users
    if (req.user?.role === Role.STORE) {
      const product = await prisma.product.findUnique({
        where: { id: job.productId },
        select: { storeId: true },
      });
      if (!product || product.storeId !== req.user.storeId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // If already succeeded or failed, return cached result
    if (job.status === "SUCCEEDED" || job.status === "FAILED") {
      return res.json({
        id: job.id,
        productId: job.productId,
        status: job.status,
        glbUrl: job.glbUrl,
        error: job.errorMsg,
        progress: job.status === "SUCCEEDED" ? 100 : 0,
      });
    }

    // Query Meshy API for latest status
    if (!job.taskId) {
      return res.json({
        id: job.id,
        productId: job.productId,
        status: job.status,
        progress: 0,
      });
    }

    const meshyStatus = await getTaskStatus(job.taskId);

    // Update job status
    if (meshyStatus.status === "SUCCEEDED" && meshyStatus.model_urls?.glb) {
      // Use Meshy URL directly (valid for 7 days)
      // TODO: For production, compress and upload to permanent storage
      const glbUrl = meshyStatus.model_urls.glb;

      // Update product with arUrl
      await prisma.product.update({
        where: { id: job.productId },
        data: { arUrl: glbUrl },
      });

      // Update job
      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          glbUrl: glbUrl,
          metadata: meshyStatus as any,
        },
      });

      return res.json({
        id: job.id,
        productId: job.productId,
        status: "SUCCEEDED",
        glbUrl: glbUrl,
        progress: 100,
      });
    } else if (meshyStatus.status === "FAILED") {
      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMsg: meshyStatus.error || "Unknown error from Meshy",
        },
      });

      return res.json({
        id: job.id,
        productId: job.productId,
        status: "FAILED",
        error: meshyStatus.error,
        progress: 0,
      });
    } else {
      // Still in progress
      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: "IN_PROGRESS",
        },
      });

      return res.json({
        id: job.id,
        productId: job.productId,
        status: meshyStatus.status,
        progress: meshyStatus.progress,
      });
    }
  } catch (error) {
    console.error("AI 3D status check error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check status" });
  }
});

/**
 * GET /api/admin/ai-3d/jobs/product/:productId
 * Get all 3D generation jobs for a product
 */
router.get("/jobs/product/:productId", requireRole([Role.ADMIN, Role.STORE]), async (req: AuthenticatedRequest, res) => {
  try {
    const productId = Number(req.params.productId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check access
    if (req.user?.role === Role.STORE && product.storeId !== req.user.storeId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const jobs = await (prisma as any).aI3DJob.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({ jobs });
  } catch (error) {
    console.error("AI 3D jobs fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default router;
