import { z } from "zod";

// ─── Order ───────────────────────────────────
export const orderStatusEnum = z.enum([
  "draft",
  "confirmed",
  "sent_to_kitchen",
  "completed",
  "cancelled",
]);

export const kitchenStatusEnum = z.enum([
  "pending",
  "to_cook",
  "preparing",
  "done",
]);

export const itemPriorityEnum = z.enum([
  "normal",
  "important",
  "not_important",
]);

export const createOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table"),
  sessionId: z.string().uuid("Invalid session"),
  notes: z.string().max(500).optional(),
});

export const addOrderItemSchema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid("Invalid product"),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(999),
  notes: z.string().max(200).optional(),
});

export const updateOrderItemQuantitySchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().min(0).max(999), // 0 = remove
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusEnum,
});

export const updateKitchenStatusSchema = z.object({
  orderItemId: z.string().uuid(),
  kitchenStatus: kitchenStatusEnum,
});

export const updateItemPrioritySchema = z.object({
  orderItemId: z.string().uuid(),
  priority: itemPriorityEnum,
});

export type OrderStatus = z.infer<typeof orderStatusEnum>;
export type KitchenStatus = z.infer<typeof kitchenStatusEnum>;
export type ItemPriority = z.infer<typeof itemPriorityEnum>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemQuantityInput = z.infer<typeof updateOrderItemQuantitySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateKitchenStatusInput = z.infer<typeof updateKitchenStatusSchema>;
export type UpdateItemPriorityInput = z.infer<typeof updateItemPrioritySchema>;
