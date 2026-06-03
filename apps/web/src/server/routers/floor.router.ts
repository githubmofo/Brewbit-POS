import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc";
import { floors } from "../db/schema";
import { createFloorSchema, updateFloorSchema } from "@pos/validators";
import { eq, asc } from "drizzle-orm";

export const floorRouter = createTRPCRouter({
  // Lists all active floors along with their child tables sorted by order
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.floors.findMany({
      where: eq(floors.isActive, true),
      orderBy: [asc(floors.sortOrder)],
      with: {
        tables: {
          orderBy: (tables, { asc }) => [asc(tables.label)],
        },
      },
    });
  }),

  // Admin-only procedure to create a new dining floor
  create: adminProcedure
    .input(createFloorSchema)
    .mutation(async ({ ctx, input }) => {
      const [newFloor] = await ctx.db
        .insert(floors)
        .values({
          name: input.name,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
        })
        .returning();
      return newFloor;
    }),

  // Admin-only procedure to modify a dining floor configuration
  update: adminProcedure
    .input(updateFloorSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedFloor] = await ctx.db
        .update(floors)
        .set(data)
        .where(eq(floors.id, id))
        .returning();
      return updatedFloor;
    }),
});
export type FloorRouter = typeof floorRouter;
