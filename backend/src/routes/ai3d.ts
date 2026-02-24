import { Router } from "express";
import { requireRole, AuthenticatedRequest } from "../lib/auth.js";
import { createImageTo3DTask, getTaskStatus, downloadGLB } from "../lib/meshy.js";
import { uploadGLB, isFileTooLargeError } from "../lib/cloudinary.js";
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
      const tempGlbUrl = meshyStatus.model_urls.glb;

      // --- Production-ready flow: compress and upload to permanent storage ---
      try {
        // 1. Download GLB from temporary URL
        const originalBuffer = await downloadGLB(tempGlbUrl);
        const originalSize = originalBuffer.length;

        // 2. Compress the GLB (standard pass; retry with max compression if upload fails by size)
        let compressedBuffer = await compressGLB(originalBuffer);
        let compressedSize = compressedBuffer.length;
        let sizeInfo = getFileSizeInfo(originalSize, compressedSize);
        console.log(`GLB compressed for product ${job.productId}: ${sizeInfo.originalSizeMB}MB -> ${sizeInfo.compressedSizeMB}MB (${sizeInfo.reductionPercent}% reduction)`);

        const uploadOptions = {
          public_id: `product_${job.productId}_3d_model_${Date.now()}.glb`,
          overwrite: true,
          resource_type: "raw" as const,
        };

        let uploadResult: { url: string; publicId: string };
        try {
          uploadResult = await uploadGLB(compressedBuffer, uploadOptions);
        } catch (firstUploadError) {
          if (!isFileTooLargeError(firstUploadError)) throw firstUploadError;
          // Retry with maximum compression for scale (many models = avoid failures later)
          console.log(`GLB for product ${job.productId} over size limit; retrying with max compression...`);
          compressedBuffer = await compressGLB(originalBuffer, { maxTextureSize: 128, maxCompression: true });
          compressedSize = compressedBuffer.length;
          sizeInfo = getFileSizeInfo(originalSize, compressedSize);
          console.log(`GLB max-compressed: ${sizeInfo.originalSizeMB}MB -> ${sizeInfo.compressedSizeMB}MB`);
          uploadResult = await uploadGLB(compressedBuffer, uploadOptions);
        }

        const permanentGlbUrl = uploadResult.url;

        // 3. Validate scale using buffer (optional but recommended)
        try {
          await validateGLBScale(compressedBuffer);
          console.log(`Scale validation passed for GLB: ${permanentGlbUrl}`);
        } catch (scaleError) {
          console.warn(`Scale validation failed for ${permanentGlbUrl}:`, scaleError);
        }

        // 4. Update product and job with permanent URL
        await prisma.product.update({
          where: { id: job.productId },
          data: { arUrl: permanentGlbUrl },
        });

        await (prisma as any).aI3DJob.update({
          where: { id: job.id },
          data: {
            status: "SUCCEEDED",
            glbUrl: permanentGlbUrl,
            metadata: {
              ...meshyStatus,
              ...sizeInfo,
            } as any,
          },
        });

        return res.json({
          id: job.id,
          productId: job.productId,
          status: "SUCCEEDED",
          glbUrl: permanentGlbUrl,
          progress: 100,
        });

      } catch (processingError) {
        console.error("Error processing and uploading GLB:", processingError);
        const errorMessage = processingError instanceof Error ? processingError.message : "Failed to process GLB";
        await (prisma as any).aI3DJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMsg: errorMessage,
          },
        });
        // Devuelve 200 con status FAILED para que el polling frontend lea el error limpiamente en vez de interpretar bloqueo de red
        return res.json({
          id: job.id,
          productId: job.productId,
          status: "FAILED",
          error: errorMessage,
          progress: 0,
        });
      }

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
