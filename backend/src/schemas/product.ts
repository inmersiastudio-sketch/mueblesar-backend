import { z } from 'zod';

/**
 * Product Zod Schemas
 * Centralized validation for product operations
 */

const productImageSchema = z.object({
  url: z.string().url(),
  type: z.string().optional(),
});

export const baseProductSchema = {
  storeId: z.number(),
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  price: z.number().nonnegative('El precio debe ser positivo'),
  category: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  depthCm: z.number().optional(),
  weightKg: z.number().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  stockQty: z.number().optional(),
  images: z.array(productImageSchema).optional(),
  arUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  glbUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  usdzUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  imageUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  inStock: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
};

export const createProductSchema = z.object(baseProductSchema);

// For update, all fields are optional except id
export const updateProductSchema = z.object({
  id: z.number(),
  storeId: z.number().optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  category: z.string().optional(),
  room: z.string().optional(),
  style: z.string().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  depthCm: z.number().optional(),
  weightKg: z.number().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  stockQty: z.number().optional(),
  images: z.array(productImageSchema).optional(),
  arUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  glbUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  usdzUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  imageUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const bulkProductItemSchema = z.union([createProductSchema, updateProductSchema]);

export const productLogQuerySchema = z.object({
  action: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ProductImageInput = z.infer<typeof productImageSchema>;

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type BulkProductItem = z.infer<typeof bulkProductItemSchema>;
export type ProductLogQuery = z.infer<typeof productLogQuerySchema>;
