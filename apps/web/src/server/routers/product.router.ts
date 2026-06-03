import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc";
import { products, productCategories, productVariants } from "../db/schema";
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
} from "@pos/validators";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  // ─── CATEGORIES ─────────────────────────────────────────────────────────────

  // Lists all active product categories sorted by ranking
  listCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.sortOrder));
  }),

  // Admin-only procedure to build a category
  createCategory: adminProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const [newCat] = await ctx.db
        .insert(productCategories)
        .values({
          name: input.name,
          color: input.color ?? "#E28743",
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
        })
        .returning();
      return newCat;
    }),

  // Admin-only procedure to modify a category
  updateCategory: adminProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedCat] = await ctx.db
        .update(productCategories)
        .set(data)
        .where(eq(productCategories.id, id))
        .returning();
      return updatedCat;
    }),

  // ─── PRODUCTS ───────────────────────────────────────────────────────────────

  // Lists all active products with their categories and variants
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.products.findMany({
      where: eq(products.isActive, true),
      orderBy: [asc(products.name)],
      with: {
        category: true,
        variants: {
          where: eq(productVariants.isActive, true),
        },
      },
    });
  }),

  // Get single product details
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
        with: {
          category: true,
          variants: {
            where: eq(productVariants.isActive, true),
          },
        },
      });
      return product ?? null;
    }),

  // Admin-only procedure to build a product
  create: adminProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          name: input.name,
          description: input.description ?? "",
          categoryId: input.categoryId,
          price: input.price.toString(), // numeric column is stored as string in JS to preserve decimal precision
          unit: input.unit ?? "piece",
          taxRate: input.taxRate.toString(),
          imageUrl: input.imageUrl ?? "",
          isActive: input.isActive ?? true,
        })
        .returning();
      return newProduct;
    }),

  // Admin-only procedure to modify a product
  update: adminProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const payload: Record<string, unknown> = { ...data };
      if (data.price !== undefined) payload.price = data.price.toString();
      if (data.taxRate !== undefined) payload.taxRate = data.taxRate.toString();

      const [updatedProduct] = await ctx.db
        .update(products)
        .set(payload)
        .where(eq(products.id, id))
        .returning();
      return updatedProduct;
    }),

  // ─── VARIANTS ───────────────────────────────────────────────────────────────

  // Admin-only procedure to create product modifiers (extra shot, size, toppings)
  createVariant: adminProcedure
    .input(createVariantSchema)
    .mutation(async ({ ctx, input }) => {
      const [newVariant] = await ctx.db
        .insert(productVariants)
        .values({
          productId: input.productId,
          attributeName: input.attributeName,
          attributeValue: input.attributeValue,
          extraPrice: input.extraPrice.toString(),
          isActive: input.isActive ?? true,
        })
        .returning();
      return newVariant;
    }),
});
export type ProductRouter = typeof productRouter;
