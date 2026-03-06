import { Router } from "express";
import { requireRole, AuthenticatedRequest } from "../lib/auth.js";
import { createImageTo3DTask, getTaskStatus, downloadGLB } from "../lib/meshy.js";
import { TripoClient } from "../lib/tripo.js";
import { uploadGLBToS3, uploadUSDZToS3 } from "../lib/s3.js";
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
    const { productId, imageUrl, imageUrls, provider = "tripo" } = req.body;

    const finalUrls: string[] = imageUrls || (imageUrl ? [imageUrl] : []);

    if (!productId || finalUrls.length === 0) {
      return res.status(400).json({ error: "productId and at least one image url are required" });
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
        imageUrl: finalUrls[0], // Keep for backwards compat
        imageUrls: finalUrls,
        provider,
        status: "PENDING",
      },
    });

    // Start API task
    try {
      let taskId = "";
      if (provider === "tripo") {
        const tripo = new TripoClient();
        taskId = await tripo.createMultiviewTask(finalUrls);
      } else {
        taskId = await createImageTo3DTask({
          imageUrl: finalUrls[0],
          enablePbr: true,
          aiModel: "latest",
        });
      }

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
  } catch (error: any) {
    const errDetail = error?.response?.data ? JSON.stringify(error.response.data) : (error instanceof Error ? error.message : "Unknown");
    return res.status(500).json({ error: errDetail });
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
        metadata: job.metadata,
        error: job.errorMsg,
        progress: job.status === "SUCCEEDED" ? 100 : 0,
      });
    }

    // Query API for latest status
    if (!job.taskId) {
      return res.json({
        id: job.id,
        productId: job.productId,
        status: job.status,
        progress: 0,
      });
    }

    let thirdPartyStatus: { status: string; progress: number; error?: string; model_urls?: { glb?: string; usdz?: string } } = {
      status: "IN_PROGRESS",
      progress: 0
    };

    if (job.provider === "tripo") {
      const tripo = new TripoClient();
      const tStatus = await tripo.getTaskStatus(job.taskId);

      let mappedStatus = "IN_PROGRESS";
      if (tStatus.status === "success") mappedStatus = "SUCCEEDED";
      if (tStatus.status === "failed") mappedStatus = "FAILED";

      thirdPartyStatus = {
        status: mappedStatus,
        progress: tStatus.progress || 0,
        error: tStatus.message,
        model_urls: tStatus.model ? { glb: tStatus.model } : undefined,
      };
    } else {
      // Meshy fallback
      const mStatus = await getTaskStatus(job.taskId);
      thirdPartyStatus = {
        status: mStatus.status,
        progress: mStatus.progress,
        error: mStatus.error,
        model_urls: mStatus.model_urls,
      };
    }

    // Update job status
    if (thirdPartyStatus.status === "SUCCEEDED" && thirdPartyStatus.model_urls?.glb) {
      const tempGlbUrl = thirdPartyStatus.model_urls.glb;
      const tempUsdzUrl = thirdPartyStatus.model_urls.usdz;

      // --- Production-ready flow: compress and upload to permanent storage ---
      try {
        // 1. Download GLB from temporary URL
        const originalBuffer = await downloadGLB(tempGlbUrl);
        const originalSize = originalBuffer.length;

        // 2. Compress the GLB (standard pass; retry with max compression if upload fails by size)
        let compressedBuffer = await compressGLB(originalBuffer);
        let compressedSize = compressedBuffer.length;
        let sizeInfo = getFileSizeInfo(originalSize, compressedSize);

        // Use AWS S3 if configured, otherwise fallback to Cloudinary (or fail)
        const fileKey = `product_${job.productId}_3d_model_${Date.now()}.glb`;

        let uploadResult: { url: string; publicId: string };
        try {
          // If AWS is configured, use it
          if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_BUCKET_NAME) {
            uploadResult = await uploadGLBToS3(compressedBuffer, fileKey);
          } else {
            // Fallback to Cloudinary (legacy)
            const uploadOptions = {
              public_id: fileKey,
              overwrite: true,
              resource_type: "raw" as const,
            };
            uploadResult = await uploadGLB(compressedBuffer, uploadOptions);
          }
        } catch (firstUploadError) {
          // Only retry compression for Cloudinary size limits, as S3 has no such limit
          if (!isFileTooLargeError(firstUploadError)) throw firstUploadError;

          // Retry with maximum compression for scale (many models = avoid failures later)
          compressedBuffer = await compressGLB(originalBuffer, { maxTextureSize: 128, maxCompression: true });
          compressedSize = compressedBuffer.length;
          sizeInfo = getFileSizeInfo(originalSize, compressedSize);

          if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_BUCKET_NAME) {
            uploadResult = await uploadGLBToS3(compressedBuffer, fileKey);
          } else {
            const uploadOptions = {
              public_id: fileKey,
              overwrite: true,
              resource_type: "raw" as const,
            };
            uploadResult = await uploadGLB(compressedBuffer, uploadOptions);
          }
        }

        const permanentGlbUrl = uploadResult.url;
        let permanentUsdzUrl = "";

        if (tempUsdzUrl && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_BUCKET_NAME) {
          try {
            // downloadGLB is just a generic buffer fetcher
            const usdzBuffer = await downloadGLB(tempUsdzUrl);
            const usdzKey = `product_${job.productId}_3d_model_${Date.now()}.usdz`;
            const usdzUploadResult = await uploadUSDZToS3(usdzBuffer, usdzKey);
            permanentUsdzUrl = usdzUploadResult.url;
          } catch (usdzErr) {
            console.error(`Failed to process USDZ for product ${job.productId}:`, usdzErr);
          }
        }

        // 3. Validate scale using buffer (optional but recommended)
        try {
          await validateGLBScale(compressedBuffer);
        } catch (scaleError) {
          console.warn(`Scale validation failed for ${permanentGlbUrl}:`, scaleError);
        }

        // 4. Update product and job with permanent URL
        await (prisma.product.update as any)({
          where: { id: job.productId },
          data: {
            arUrl: permanentGlbUrl,   // Keep arUrl as plain GLB URL for backward compat
            glbUrl: permanentGlbUrl,
            usdzUrl: permanentUsdzUrl || null,
          },
        });

        await (prisma as any).aI3DJob.update({
          where: { id: job.id },
          data: {
            status: "SUCCEEDED",
            glbUrl: permanentGlbUrl,
            metadata: {
              ...thirdPartyStatus,
              ...sizeInfo,
              usdzUrl: permanentUsdzUrl,
            } as any,
          },
        });

        return res.json({
          id: job.id,
          productId: job.productId,
          status: "SUCCEEDED",
          glbUrl: permanentGlbUrl,
          metadata: {
            ...thirdPartyStatus,
            ...sizeInfo,
            usdzUrl: permanentUsdzUrl,
          },
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

    } else if (thirdPartyStatus.status === "FAILED") {
      await (prisma as any).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMsg: thirdPartyStatus.error || "Unknown API error",
        },
      });

      return res.json({
        id: job.id,
        productId: job.productId,
        status: "FAILED",
        error: thirdPartyStatus.error,
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
        status: thirdPartyStatus.status,
        progress: thirdPartyStatus.progress,
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
