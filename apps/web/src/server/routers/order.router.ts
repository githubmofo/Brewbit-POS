import {
  createTRPCRouter,
  protectedProcedure,
  kitchenProcedure,
} from "../trpc";
import {
  orders,
  orderItems,
  products,
  productVariants,
  tables,
  sessions,
} from "../db/schema";
import {
  createOrderSchema,
  addOrderItemSchema,
  updateOrderItemQuantitySchema,
  updateOrderStatusSchema,
  updateKitchenStatusSchema,
  updateItemPrioritySchema,
} from "@pos/validators";
import { eq, and, sql, not, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Recalculates the billing totals (subtotal, tax, final total) for an order,
 * ensuring database alignment of all lines.
 */
async function recalculateOrderTotals(db: any, orderId: string) {
  // Fetch all current items along with their nested product and variant configurations
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
    with: {
      product: true,
      variant: true,
    },
  });

  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const basePrice = parseFloat(item.product.price);
    const extraPrice = item.variant ? parseFloat(item.variant.extraPrice) : 0;
    const unitPrice = basePrice + extraPrice;
    const taxRate = parseFloat(item.product.taxRate);

    const lineTotal = unitPrice * item.quantity;
    const lineTax = lineTotal * (taxRate / 100);

    subtotal += lineTotal;
    taxTotal += lineTax;

    // Update item line pricing records
    await db
      .update(orderItems)
      .set({
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      })
      .where(eq(orderItems.id, item.id));
  }

  const total = subtotal + taxTotal;

  // Update order table totals
  const [updatedOrder] = await db
    .update(orders)
    .set({
      subtotal: subtotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      total: total.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  return updatedOrder;
}

export const orderRouter = createTRPCRouter({
  // Gets the currently active uncompleted order for a specific dining table
  getByTable: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.orders.findFirst({
        where: and(
          eq(orders.tableId, input.tableId),
          not(inArray(orders.status, ["completed", "cancelled"])),
        ),
        with: {
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      return order ?? null;
    }),

  // Lists ALL active (non-completed/cancelled) orders for a specific dining table
  listByTable: protectedProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tableOrders = await ctx.db.query.orders.findMany({
        where: and(
          eq(orders.tableId, input.tableId),
          not(inArray(orders.status, ["completed", "cancelled"])),
        ),
        orderBy: orders.createdAt,
        with: {
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      return tableOrders;
    }),

  // Fetches a single order details by its direct UUID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: {
          table: true,
          session: true,
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      return order ?? null;
    }),

  // Lists all active kitchen order tickets (preparing, to cook, pending)
  listKitchenTickets: kitchenProcedure.query(async ({ ctx }) => {
    return ctx.db.query.orders.findMany({
      where: not(inArray(orders.status, ["draft", "completed", "cancelled"])),
      orderBy: orders.createdAt,
      with: {
        table: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }),

  // POS endpoint to check for recently "done" items to trigger sound notification
  checkReadyItems: protectedProcedure.query(async ({ ctx }) => {
    // Finds any order item that is "done" but order is not completed
    const items = await ctx.db.query.orderItems.findMany({
      where: eq(orderItems.kitchenStatus, "done"),
      with: {
        order: true,
      },
    });

    // Filter to only items belonging to current user's active session/tables
    return items.filter(
      (item) =>
        item.order &&
        item.order.userId === ctx.user.id &&
        item.order.status !== "completed" &&
        item.order.status !== "cancelled",
    ).length;
  }),

  // Creates a new blank draft order for a dining table
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if table is active and occupied already
      const tableRecord = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.tableId),
      });

      if (!tableRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dining table not found.",
        });
      }

      // Check if there is already an active order for this table
      const activeOrder = await ctx.db.query.orders.findFirst({
        where: and(
          eq(orders.tableId, input.tableId),
          not(inArray(orders.status, ["completed", "cancelled"])),
        ),
      });

      if (activeOrder) {
        return activeOrder; // return active order to prevent duplication
      }

      // Generate human-friendly order sequence number
      const countRes = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(orders);
      const count = Number(countRes[0]?.count ?? 0);
      const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const orderNumber = `ORD-${dateCode}-${(count + 1).toString().padStart(4, "0")}`;

      const [newOrder] = await ctx.db
        .insert(orders)
        .values({
          sessionId: input.sessionId,
          tableId: input.tableId,
          userId: ctx.user.id,
          orderNumber,
          status: "draft",
          notes: input.notes ?? "",
        })
        .returning();

      // Lock table status to "occupied"
      await ctx.db
        .update(tables)
        .set({ status: "occupied" })
        .where(eq(tables.id, input.tableId));

      return newOrder;
    }),

  // Adds an item to a draft order (or aggregates quantity if product matches)
  addItem: protectedProcedure
    .input(addOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const orderRecord = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!orderRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (
        orderRecord.status === "completed" ||
        orderRecord.status === "cancelled"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add items to completed or cancelled orders.",
        });
      }

      // Look up target product to retrieve pricing
      const productRecord = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
      });

      if (!productRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      // Look up variant if specified
      let extra = 0;
      if (input.variantId) {
        const variantRecord = await ctx.db.query.productVariants.findFirst({
          where: eq(productVariants.id, input.variantId),
        });
        if (variantRecord) {
          extra = parseFloat(variantRecord.extraPrice);
        }
      }

      const unitPrice = parseFloat(productRecord.price) + extra;

      // Check if product with identical variant already exists in this order
      const existingItem = await ctx.db.query.orderItems.findFirst({
        where: and(
          eq(orderItems.orderId, input.orderId),
          eq(orderItems.productId, input.productId),
          input.variantId
            ? eq(orderItems.variantId, input.variantId)
            : sql`${orderItems.variantId} IS NULL`,
        ),
      });

      if (existingItem) {
        // Aggregate quantities
        const nextQty = existingItem.quantity + input.quantity;
        await ctx.db
          .update(orderItems)
          .set({
            quantity: nextQty,
            lineTotal: (unitPrice * nextQty).toFixed(2),
            notes: input.notes ?? existingItem.notes,
          })
          .where(eq(orderItems.id, existingItem.id));
      } else {
        // Insert new order item
        await ctx.db.insert(orderItems).values({
          orderId: input.orderId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          quantity: input.quantity,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: (unitPrice * input.quantity).toFixed(2),
          notes: input.notes ?? "",
          kitchenStatus: "pending",
        });
      }

      // Calculate totals
      return recalculateOrderTotals(ctx.db, input.orderId);
    }),

  // Adjusts item quantity, or removes it if set to 0
  updateItemQuantity: protectedProcedure
    .input(updateOrderItemQuantitySchema)
    .mutation(async ({ ctx, input }) => {
      const itemRecord = await ctx.db.query.orderItems.findFirst({
        where: eq(orderItems.id, input.orderItemId),
      });

      if (!itemRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order line item not found.",
        });
      }

      const orderId = itemRecord.orderId;

      if (input.quantity <= 0) {
        // Remove item from database
        await ctx.db
          .delete(orderItems)
          .where(eq(orderItems.id, input.orderItemId));
      } else {
        // Update item quantity
        const price = parseFloat(itemRecord.unitPrice);
        await ctx.db
          .update(orderItems)
          .set({
            quantity: input.quantity,
            lineTotal: (price * input.quantity).toFixed(2),
          })
          .where(eq(orderItems.id, input.orderItemId));
      }

      // Calculate totals
      return recalculateOrderTotals(ctx.db, orderId);
    }),

  // Progresses order status (e.g. draft -> confirmed)
  updateStatus: protectedProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const orderRecord = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!orderRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      // If transitioning to "confirmed" or "sent_to_kitchen", lock kitchen status for items
      if (input.status === "confirmed" || input.status === "sent_to_kitchen") {
        await ctx.db
          .update(orderItems)
          .set({ kitchenStatus: "to_cook" })
          .where(eq(orderItems.orderId, input.orderId));
      }

      const [updatedOrder] = await ctx.db
        .update(orders)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId))
        .returning();

      // If order is cancelled, free table status
      if (input.status === "cancelled") {
        await ctx.db
          .update(tables)
          .set({ status: "free" })
          .where(eq(tables.id, orderRecord.tableId));
      }

      return updatedOrder;
    }),

  // Kitchen-only procedure to progress cooking status of a ticket line item
  updateKitchenStatus: kitchenProcedure
    .input(updateKitchenStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedItem] = await ctx.db
        .update(orderItems)
        .set({ kitchenStatus: input.kitchenStatus })
        .where(eq(orderItems.id, input.orderItemId))
        .returning();

      return updatedItem;
    }),

  // Kitchen procedure to update priority of a ticket line item
  updateItemPriority: kitchenProcedure
    .input(updateItemPrioritySchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedItem] = await ctx.db
        .update(orderItems)
        .set({ priority: input.priority })
        .where(eq(orderItems.id, input.orderItemId))
        .returning();

      return updatedItem;
    }),

  // ─── CUSTOMER SELF-ORDER ────────────────────────────────────────────────────
  // Customer-facing endpoint: creates a complete order from cart items in one shot.
  // Uses a persistent "Self-Order" system session to satisfy the sessionId FK.
  customerPlace: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        items: z
          .array(
            z.object({
              productId: z.string().uuid(),
              variantId: z.string().uuid().nullish(),
              quantity: z.number().int().min(1),
              notes: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verify the table exists and is free
      const tableRecord = await ctx.db.query.tables.findFirst({
        where: eq(tables.id, input.tableId),
      });

      if (!tableRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found." });
      }

      // 2. Find or create a system "Self-Order" session for customer orders
      let selfOrderSession = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.userId, ctx.user.id),
          eq(sessions.status, "open"),
        ),
      });

      if (!selfOrderSession) {
        const [created] = await ctx.db
          .insert(sessions)
          .values({
            userId: ctx.user.id,
            status: "open",
            openingBalance: "0.00",
          })
          .returning();
        selfOrderSession = created!;
      }

      // 3. Generate order number
      const countRes = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(orders);
      const count = Number(countRes[0]?.count ?? 0);
      const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const orderNumber = `SO-${dateCode}-${(count + 1).toString().padStart(4, "0")}`;

      // 4. Create the order as "confirmed" (skip draft for self-orders)
      const [newOrder] = await ctx.db
        .insert(orders)
        .values({
          sessionId: selfOrderSession.id,
          tableId: input.tableId,
          userId: ctx.user.id,
          orderNumber,
          status: "confirmed",
          notes: "",
        })
        .returning();

      // 5. Insert all order items with pricing lookup
      let subtotal = 0;
      let taxTotal = 0;

      for (const item of input.items) {
        const productRecord = await ctx.db.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!productRecord) continue;

        let extra = 0;
        if (item.variantId) {
          const variantRecord = await ctx.db.query.productVariants.findFirst({
            where: eq(productVariants.id, item.variantId),
          });
          if (variantRecord) extra = parseFloat(variantRecord.extraPrice);
        }

        const unitPrice = parseFloat(productRecord.price) + extra;
        const lineTotal = unitPrice * item.quantity;
        const taxRate = parseFloat(productRecord.taxRate);
        const lineTax = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        taxTotal += lineTax;

        await ctx.db.insert(orderItems).values({
          orderId: newOrder!.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
          notes: item.notes ?? "",
          kitchenStatus: "to_cook",
        });
      }

      // 6. Update order totals
      const total = subtotal + taxTotal;
      await ctx.db
        .update(orders)
        .set({
          subtotal: subtotal.toFixed(2),
          taxTotal: taxTotal.toFixed(2),
          total: total.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, newOrder!.id));

      // 7. Mark table as occupied
      await ctx.db
        .update(tables)
        .set({ status: "occupied" })
        .where(eq(tables.id, input.tableId));

      return {
        ...newOrder!,
        orderNumber,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
      };
    }),

  // Retrieves the complete order history for the current logged-in customer
  listCustomerOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.orders.findMany({
      where: eq(orders.userId, ctx.user.id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      with: {
        table: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }),
});
export type OrderRouter = typeof orderRouter;

