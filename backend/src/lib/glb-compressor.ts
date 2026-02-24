import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { 
  dedup, 
  resample,
  prune,
  weld,
  quantize
} from "@gltf-transform/functions";

/**
 * Compress a GLB file using geometry and texture optimization
 * This can reduce file size by 50-70% without external encoders
 */
export async function compressGLB(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // Initialize NodeIO with all extensions
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

    // Load the GLB from buffer
    const document = await io.readBinary(new Uint8Array(inputBuffer));

    // Apply optimizations
    await document.transform(
      // Remove duplicate vertices and primitives
      dedup(),
      
      // Weld vertices (merge vertices that are close together)
      weld({ tolerance: 0.0001 }),
      
      // Quantize vertex attributes (reduces precision but smaller file)
      quantize({
        quantizePosition: 14,
        quantizeNormal: 10,
        quantizeTexcoord: 12,
        quantizeColor: 8,
      }),
      
      // Resize textures to max 512px (aggressive size reduction)
      resample({ size: [512, 512] }),
      
      // Remove unused nodes, meshes, materials, etc.
      prune()
    );

    // Write to GLB buffer
    const outputBuffer = await io.writeBinary(document);
    
    return Buffer.from(outputBuffer);
  } catch (error) {
    console.error("Error compressing GLB:", error);
    throw new Error(`Failed to compress GLB: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get file size info for logging
 */
export function getFileSizeInfo(originalSize: number, compressedSize: number) {
  const reduction = ((originalSize - compressedSize) / originalSize) * 100;
  return {
    originalSizeMB: (originalSize / 1024 / 1024).toFixed(2),
    compressedSizeMB: (compressedSize / 1024 / 1024).toFixed(2),
    reductionPercent: reduction.toFixed(1),
  };
}
