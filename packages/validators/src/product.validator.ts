import { z } from "zod";

// ─── Product Category ────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ─── Product ─────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid("Invalid category"),
  price: z.number().positive("Price must be positive").multipleOf(0.01),
  unit: z.string().max(20).default("piece"),
  taxRate: z.number().min(0).max(100).default(0),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── Product Variant ─────────────────────────
export const createVariantSchema = z.object({
  productId: z.string().uuid(),
  attributeName: z.string().min(1).max(100),
  attributeValue: z.string().min(1).max(100),
  extraPrice: z.number().min(0).multipleOf(0.01).default(0),
  isActive: z.boolean().default(true),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
