import { createTRPCRouter, protectedProcedure, adminProcedure, cashierProcedure } from "../trpc";
import { sessions, tables } from "../db/schema";
import { openSessionSchema, closeSessionSchema } from "@pos/validators";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const sessionRouter = createTRPCRouter({
  // Administrative procedure to review register ledger session history
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.sessions.findMany({
      orderBy: (sessions, { desc }) => [desc(sessions.openedAt)],
      with: {
        user: true,
      },
    });
  }),

  // Resolves the current open session of the logged-in staff member
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const session = await ctx.db.query.sessions.findFirst({
      where: and(eq(sessions.userId, ctx.user.id), eq(sessions.status, "open")),
    });
    return session ?? null;
  }),

  // Opens a new cashier register drawer session with an initial opening balance
  open: cashierProcedure
    .input(openSessionSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce lock: one open session per cashier employee
      const existing = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.userId, ctx.user.id),
          eq(sessions.status, "open"),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an active open cash drawer session.",
        });
      }

      const [newSession] = await ctx.db
        .insert(sessions)
        .values({
          userId: ctx.user.id,
          status: "open",
          openingBalance: input.openingBalance.toString(),
        })
        .returning();

      return newSession;
    }),

  // Closes an active register session and logs the ending drawer balance
  close: cashierProcedure
    .input(closeSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.id, input.sessionId),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Register session not found.",
        });
      }

      if (existing.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This register session is already closed.",
        });
      }

      const [updatedSession] = await ctx.db
        .update(sessions)
        .set({
          status: "closed",
          closingBalance: input.closingBalance.toString(),
          closedAt: new Date(),
        })
        .where(eq(sessions.id, input.sessionId))
        .returning();

      // Automatically unlock any tables this user has locked
      await ctx.db
        .update(tables)
        .set({
          lockedByUserId: null,
          lockedAt: null,
        })
        .where(eq(tables.lockedByUserId, ctx.user.id));

      return updatedSession;
    }),
});
export type SessionRouter = typeof sessionRouter;
