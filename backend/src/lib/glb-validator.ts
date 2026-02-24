import { Document } from "@gltf-transform/core";

export interface GLBValidationResult {
  valid: boolean;
  boundingBox?: {
    width: number;
    height: number;
    depth: number;
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate GLB bounding box dimensions
 * Expected: furniture in meters (e.g., sofa ~2m wide)
 */
export async function validateGLBScale(buffer: Buffer): Promise<GLBValidationResult> {
  try {
    const { WebIO } = await import("@gltf-transform/core");
    const io = new WebIO();
    const doc: Document = await io.readBinary(new Uint8Array(buffer));

    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];

    if (!scene) {
      return {
        valid: false,
        errors: ["No scene found in GLB"],
      };
    }

    // Calculate bounding box
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    scene.listChildren().forEach((node) => {
      const mesh = node.getMesh();
      if (!mesh) return;

      mesh.listPrimitives().forEach((primitive) => {
        const position = primitive.getAttribute("POSITION");
        if (!position) return;

        const array = position.getArray();
        if (!array) return;

        for (let i = 0; i < array.length; i += 3) {
          const x = array[i];
          const y = array[i + 1];
          const z = array[i + 2];

          if (x !== undefined) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
          if (y !== undefined) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
          if (z !== undefined) {
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
          }
        }
      });
    });

    if (!isFinite(minX) || !isFinite(maxX)) {
      return {
        valid: false,
        errors: ["Could not calculate bounding box"],
      };
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Reasonable furniture dimensions: 0.1m (10cm) to 10m
    const MIN = 0.1;
    const MAX = 10;

    if (width < MIN || width > MAX) {
      warnings.push(`Width ${width.toFixed(2)}m is unusual (expected ${MIN}-${MAX}m)`);
    }
    if (height < MIN || height > MAX) {
      warnings.push(`Height ${height.toFixed(2)}m is unusual (expected ${MIN}-${MAX}m)`);
    }
    if (depth < MIN || depth > MAX) {
      warnings.push(`Depth ${depth.toFixed(2)}m is unusual (expected ${MIN}-${MAX}m)`);
    }

    // Too small (likely millimeters instead of meters)
    if (width < 0.05 || height < 0.05 || depth < 0.05) {
      errors.push("Model appears too small. Check if units are in millimeters instead of meters.");
    }

    // Too large
    if (width > 20 || height > 20 || depth > 20) {
      errors.push("Model appears too large. Consider scaling down.");
    }

    return {
      valid: errors.length === 0,
      boundingBox: { width, height, depth },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Unknown validation error"],
    };
  }
}
