import { createTRPCRouter, protectedProcedure, adminProcedure, cashierProcedure } from "../trpc";
import { payments, orders, tables, paymentMethodsConfig } from "../db/schema";
import {
  processPaymentSchema,
  confirmPaymentSchema,
  updatePaymentMethodConfigSchema,
} from "@pos/validators";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const paymentRouter = createTRPCRouter({
  // Retrieves merchant configuration statuses (Enabled payment types and UPI VPA)
  getConfigs: protectedProcedure.query(async ({ ctx }) => {
    // Return all configurations to the cashiers
    return ctx.db.select().from(paymentMethodsConfig);
  }),

  // Admin-only procedure to configure merchant credentials
  updateConfig: adminProcedure
    .input(updatePaymentMethodConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { method, isEnabled, upiId, settings } = input;

      // Upsert payment config using insert or conflict update
      const [updated] = await ctx.db
        .insert(paymentMethodsConfig)
        .values({
          method,
          isEnabled,
          upiId: upiId ?? null,
          settings: settings ?? {},
        })
        .onConflictDoUpdate({
          target: paymentMethodsConfig.method,
          set: {
            isEnabled,
            upiId: upiId ?? null,
            settings: settings ?? {},
          },
        })
        .returning();

      return updated;
    }),

  // Process a cash, card/digital, or UPI QR transaction
  process: cashierProcedure
    .input(processPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const orderRecord = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!orderRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order record not found.",
        });
      }

      if (
        orderRecord.status === "completed" ||
        orderRecord.status === "cancelled"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order is already settled or cancelled.",
        });
      }

      // If Cash or Digital Card, payment is immediately confirmed
      const autoConfirm = input.method === "cash" || input.method === "digital";
      const paymentStatus = autoConfirm ? "confirmed" : "pending";

      const [newPayment] = await ctx.db
        .insert(payments)
        .values({
          orderId: input.orderId,
          method: input.method,
          amount: input.amount.toString(),
          status: paymentStatus,
          transactionRef: input.transactionRef ?? null,
          upiId: input.upiId ?? null,
        })
        .returning();

      // If auto-confirmed, complete the order and mark table dirty
      if (autoConfirm) {
        await ctx.db
          .update(orders)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, input.orderId));

        await ctx.db
          .update(tables)
          .set({ status: "dirty" })
          .where(eq(tables.id, orderRecord.tableId));
      }

      return newPayment;
    }),

  // Cashier manually confirms a pending payment (like validating UPI QR receipt)
  confirm: cashierProcedure
    .input(confirmPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const paymentRecord = await ctx.db.query.payments.findFirst({
        where: eq(payments.id, input.paymentId),
      });

      if (!paymentRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment transaction not found.",
        });
      }

      if (paymentRecord.status === "confirmed") {
        return paymentRecord;
      }

      const [updatedPayment] = await ctx.db
        .update(payments)
        .set({ status: "confirmed" })
        .where(eq(payments.id, input.paymentId))
        .returning();

      // Fetch corresponding order to complete billing
      const orderRecord = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, paymentRecord.orderId),
      });

      if (orderRecord) {
        await ctx.db
          .update(orders)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, paymentRecord.orderId));

        await ctx.db
          .update(tables)
          .set({ status: "dirty" })
          .where(eq(tables.id, orderRecord.tableId));
      }

      return updatedPayment;
    }),
});
export type PaymentRouter = typeof paymentRouter;
