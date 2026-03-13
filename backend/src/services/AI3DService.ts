import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createImageTo3DTask, getTaskStatus, downloadGLB } from '../lib/meshy.js';
import { TripoClient } from '../lib/tripo.js';
import { uploadGLBToS3, uploadUSDZToS3 } from '../lib/s3.js';
import { uploadGLB, isFileTooLargeError } from '../lib/cloudinary.js';
import { validateGLBScale } from '../lib/glb-validator.js';
import { compressGLB, getFileSizeInfo } from '../lib/glb-compressor.js';
import { imageProcessingService } from './ImageProcessingService.js';
import { Errors } from '../errors/AppError.js';
import type { AuthContext } from '../types/product.js';
import type { AI3DProvider, ThirdPartyStatus, ProcessedModelResult, JobStatusResponse } from '../types/ai3d.js';

/**
 * AI3DService - Business Logic for 3D Model Generation
 * Handles Meshy/Tripo integration, image preprocessing, compression, and storage
 */

export class AI3DService {
  /**
   * Create a new 3D generation job
   * Now with automatic background removal and white background processing
   */
  async createJob(
    productId: number,
    imageUrls: string[],
    provider: AI3DProvider,
    user: AuthContext,
    processImages: boolean = true // Enable background removal by default
  ): Promise<{ jobId: number; taskId: string; processedImageUrls: string[] }> {
    // Verify product exists and user has access
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product) {
      throw Errors.notFound('Product');
    }

    // Check access for STORE users
    if (user.role === UserRole.STORE_OWNER && product.storeId !== user.storeId) {
      throw Errors.forbidden('Access denied');
    }

    // Check AI credits
    const store = await prisma.store.findUnique({
      where: { id: product.storeId },
    }) as any;

    const remainingCredits = 1000;
    if (remainingCredits <= 0) {
      throw Errors.forbidden('No AI credits remaining. Please upgrade your subscription.');
    }

    // Process images: remove background and add white background
    let processedImageUrls = imageUrls;
    if (processImages) {
      try {
        console.log('Processing images with background removal...');
        processedImageUrls = await imageProcessingService.processMultipleImages(imageUrls);
        console.log('Images processed successfully:', processedImageUrls);
      } catch (error) {
        console.error('Image processing failed, using original URLs:', error);
        // Continue with original URLs if processing fails
        processedImageUrls = imageUrls;
      }
    }

    // Create job record with processed image URLs
    const job = await (prisma as unknown as { aI3DJob: { create: (args: unknown) => Promise<{ id: number }> } }).aI3DJob.create({
      data: {
        productId: product.id,
        imageUrl: processedImageUrls[0],
        imageUrls: processedImageUrls,
        provider,
        status: 'PENDING',
      },
    });

    // Start API task
    try {
      let taskId = '';

      if (provider === 'tripo') {
        const tripo = new TripoClient();
        taskId = await tripo.createMultiviewTask(processedImageUrls);
      } else {
        taskId = await createImageTo3DTask({
          imageUrl: processedImageUrls[0],
          enablePbr: true,
          aiModel: 'latest',
        });
      }

      await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
        where: { id: job.id },
        data: {
          taskId,
          status: 'IN_PROGRESS',
        },
      });

      return { jobId: job.id, taskId, processedImageUrls };
    } catch (error) {
      // Update job as failed
      await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMsg: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Get job status from third-party API
   */
  private async getThirdPartyStatus(
    provider: AI3DProvider,
    taskId: string
  ): Promise<ThirdPartyStatus> {
    if (provider === 'tripo') {
      const tripo = new TripoClient();
      const status = await tripo.getTaskStatus(taskId);

      let mappedStatus = 'IN_PROGRESS';
      if (status.status === 'success') mappedStatus = 'SUCCEEDED';
      if (status.status === 'failed') mappedStatus = 'FAILED';

      return {
        status: mappedStatus,
        progress: status.progress || 0,
        error: status.message,
        model_urls: status.model ? { glb: status.model } : undefined,
      };
    } else {
      // Meshy
      const status = await getTaskStatus(taskId);
      return {
        status: status.status,
        progress: status.progress,
        error: status.error,
        model_urls: status.model_urls,
      };
    }
  }

  /**
   * Process and upload model to permanent storage
   */
  private async processAndUploadModel(
    jobId: number,
    productId: number,
    tempGlbUrl: string,
    tempUsdzUrl: string | undefined,
    thirdPartyStatus: ThirdPartyStatus
  ): Promise<ProcessedModelResult> {
    // 1. Download GLB from temporary URL
    const originalBuffer = await downloadGLB(tempGlbUrl);
    const originalSize = originalBuffer.length;

    // 2. Compress the GLB
    let compressedBuffer = await compressGLB(originalBuffer);
    let compressedSize = compressedBuffer.length;
    let sizeInfo = getFileSizeInfo(originalSize, compressedSize);

    // 3. Upload to permanent storage
    const fileKey = `product_${productId}_3d_model_${Date.now()}.glb`;
    let uploadResult: { url: string; publicId: string };

    try {
      uploadResult = await this.uploadWithFallback(compressedBuffer, fileKey);
    } catch (firstUploadError) {
      // Only retry compression for Cloudinary size limits
      if (!isFileTooLargeError(firstUploadError)) throw firstUploadError;

      // Retry with maximum compression
      compressedBuffer = await compressGLB(originalBuffer, { maxTextureSize: 128, maxCompression: true });
      compressedSize = compressedBuffer.length;
      sizeInfo = getFileSizeInfo(originalSize, compressedSize);

      uploadResult = await this.uploadWithFallback(compressedBuffer, fileKey);
    }

    const permanentGlbUrl = uploadResult.url;
    let permanentUsdzUrl = '';

    // 4. Process USDZ if available and using S3
    if (tempUsdzUrl && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_BUCKET_NAME) {
      try {
        const usdzBuffer = await downloadGLB(tempUsdzUrl);
        const usdzKey = `product_${productId}_3d_model_${Date.now()}.usdz`;
        const usdzUploadResult = await uploadUSDZToS3(usdzBuffer, usdzKey);
        permanentUsdzUrl = usdzUploadResult.url;
      } catch (usdzErr) {
        console.error(`Failed to process USDZ for product ${productId}:`, usdzErr);
      }
    }

    // 5. Validate scale
    try {
      await validateGLBScale(compressedBuffer);
    } catch (scaleError) {
      console.warn(`Scale validation failed for ${permanentGlbUrl}:`, scaleError);
    }

    return {
      glbUrl: permanentGlbUrl,
      usdzUrl: permanentUsdzUrl || undefined,
      sizeInfo,
    };
  }

  /**
   * Upload with fallback between S3 and Cloudinary
   */
  private async uploadWithFallback(
    buffer: Buffer,
    fileKey: string
  ): Promise<{ url: string; publicId: string }> {
    // Use AWS S3 if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_BUCKET_NAME) {
      return uploadGLBToS3(buffer, fileKey);
    }

    // Fallback to Cloudinary
    return uploadGLB(buffer, {
      public_id: fileKey,
      overwrite: true,
      resource_type: 'raw' as const,
    });
  }

  /**
   * Update product with new model URLs
   */
  private async updateProductModel(
    productId: number,
    glbUrl: string,
    usdzUrl?: string
  ): Promise<void> {
    await prisma.productMedia.deleteMany({
      where: { productId, type: 'MODEL_3D' }
    });
    await prisma.productMedia.createMany({
      data: [
        { productId, type: 'MODEL_3D' as const, url: glbUrl, isPrimary: true },
        ...(usdzUrl ? [{ productId, type: 'MODEL_3D' as const, url: usdzUrl, isPrimary: false }] : [])
      ]
    });
  }

  /**
   * Check job status and process if complete
   */
  async checkJobStatus(
    jobId: number,
    user: AuthContext
  ): Promise<JobStatusResponse> {
    // Get job
    const job = await (prisma as unknown as {
      aI3DJob: {
        findUnique: (args: unknown) => Promise<{
          id: number;
          productId: number;
          status: string;
          glbUrl: string | null;
          metadata: unknown;
          errorMsg: string | null;
          taskId: string | null;
          provider: string;
        } | null>
      }
    }).aI3DJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw Errors.notFound('Job');
    }

    // Check access for STORE users
    if (user.role === UserRole.STORE_OWNER) {
      const product = await prisma.product.findUnique({
        where: { id: job.productId },
        select: { storeId: true },
      });
      if (!product || product.storeId !== user.storeId) {
        throw Errors.forbidden('Access denied');
      }
    }

    // Return cached result if already finalized
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
      return {
        id: job.id,
        productId: job.productId,
        status: job.status as 'SUCCEEDED' | 'FAILED',
        glbUrl: job.glbUrl || undefined,
        metadata: job.metadata,
        error: job.errorMsg || undefined,
        progress: job.status === 'SUCCEEDED' ? 100 : 0,
      };
    }

    // Query API for latest status
    if (!job.taskId) {
      return {
        id: job.id,
        productId: job.productId,
        status: 'IN_PROGRESS',
        progress: 0,
      };
    }

    const thirdPartyStatus = await this.getThirdPartyStatus(
      job.provider as AI3DProvider,
      job.taskId
    );

    // Handle completion
    if (thirdPartyStatus.status === 'SUCCEEDED' && thirdPartyStatus.model_urls?.glb) {
      try {
        const result = await this.processAndUploadModel(
          job.id,
          job.productId,
          thirdPartyStatus.model_urls.glb,
          thirdPartyStatus.model_urls.usdz,
          thirdPartyStatus
        );

        // Update product
        await this.updateProductModel(job.productId, result.glbUrl, result.usdzUrl);

        // Update job
        const metadata = {
          ...thirdPartyStatus,
          ...result.sizeInfo,
          usdzUrl: result.usdzUrl,
        };

        await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
          where: { id: job.id },
          data: {
            status: 'SUCCEEDED',
            glbUrl: result.glbUrl,
            metadata,
          },
        });

        return {
          id: job.id,
          productId: job.productId,
          status: 'SUCCEEDED',
          glbUrl: result.glbUrl,
          metadata,
          progress: 100,
        };

      } catch (processingError) {
        console.error('Error processing and uploading GLB:', processingError);
        const errorMessage = processingError instanceof Error ? processingError.message : 'Failed to process GLB';

        await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMsg: errorMessage,
          },
        });

        return {
          id: job.id,
          productId: job.productId,
          status: 'FAILED',
          error: errorMessage,
          progress: 0,
        };
      }

    } else if (thirdPartyStatus.status === 'FAILED') {
      await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMsg: thirdPartyStatus.error || 'Unknown API error',
        },
      });

      return {
        id: job.id,
        productId: job.productId,
        status: 'FAILED',
        error: thirdPartyStatus.error,
        progress: 0,
      };
    } else {
      // Still in progress
      await (prisma as unknown as { aI3DJob: { update: (args: unknown) => Promise<unknown> } }).aI3DJob.update({
        where: { id: job.id },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      return {
        id: job.id,
        productId: job.productId,
        status: 'IN_PROGRESS',
        progress: thirdPartyStatus.progress,
      };
    }
  }

  /**
   * Get all jobs for a product
   */
  async getProductJobs(productId: number, user: AuthContext): Promise<unknown[]> {
    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Errors.notFound('Product');
    }

    // Check access
    if (user.role === UserRole.STORE_OWNER && product.storeId !== user.storeId) {
      throw Errors.forbidden('Access denied');
    }

    const jobs = await (prisma as unknown as { aI3DJob: { findMany: (args: unknown) => Promise<unknown[]> } }).aI3DJob.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return jobs;
  }
}

// Export singleton
export const ai3dService = new AI3DService();
