import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  cashierProcedure,
} from "../trpc";
import { tables } from "../db/schema";
import { createTableSchema, updateTableSchema } from "@pos/validators";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const tableRouter = createTRPCRouter({
  // Lists active tables located on a specific floor
  listByFloor: publicProcedure
    .input(z.object({ floorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.tables.findMany({
        where: and(
          eq(tables.floorId, input.floorId),
          eq(tables.isActive, true),
        ),
        with: {
          lockedByUser: true,
        },
      });
    }),

  // Gets detailed status of a single table
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.id),
        with: {
          lockedByUser: true,
        },
      });
      return table ?? null;
    }),

  // Admin-only procedure to build a table
  create: adminProcedure
    .input(createTableSchema)
    .mutation(async ({ ctx, input }) => {
      const [newTable] = await ctx.db
        .insert(tables)
        .values({
          floorId: input.floorId,
          label: input.label,
          seats: input.seats ?? 2,
          positionX: input.positionX ?? 0,
          positionY: input.positionY ?? 0,
          positionZ: input.positionZ ?? 0,
          isActive: input.isActive ?? true,
        })
        .returning();
      return newTable;
    }),

  // Admin-only procedure to delete a table
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedTable] = await ctx.db
        .delete(tables)
        .where(eq(tables.id, input.id))
        .returning();
      return deletedTable;
    }),

  // Protected procedure for cashiers to alter status (free, occupied, dirty)
  update: cashierProcedure
    .input(updateTableSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedTable] = await ctx.db
        .update(tables)
        .set(data)
        .where(eq(tables.id, id))
        .returning();
      return updatedTable;
    }),

  // Lock a table for the current cashier
  lock: cashierProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.id),
      });

      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found." });
      }

      if (table.lockedByUserId && table.lockedByUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Table is currently locked by another cashier.",
        });
      }

      const [updatedTable] = await ctx.db
        .update(tables)
        .set({
          lockedByUserId: ctx.user.id,
          lockedAt: new Date(),
        })
        .where(eq(tables.id, input.id))
        .returning();

      return updatedTable;
    }),

  // Unlock a table
  unlock: cashierProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.id),
      });

      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found." });
      }

      // Can only unlock if you own the lock (or maybe allow admins later)
      if (table.lockedByUserId && table.lockedByUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only unlock tables that you have locked.",
        });
      }

      const [updatedTable] = await ctx.db
        .update(tables)
        .set({
          lockedByUserId: null,
          lockedAt: null,
        })
        .where(eq(tables.id, input.id))
        .returning();

      return updatedTable;
    }),
});
export type TableRouter = typeof tableRouter;
