import { z } from "zod";

// ─── Payment Method ─────────────────────────
export const paymentMethodEnum = z.enum(["cash", "digital", "upi_qr"]);

export const paymentStatusEnum = z.enum([
  "pending",
  "confirmed",
  "failed",
  "refunded",
]);

export const processPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order"),
  method: paymentMethodEnum,
  amount: z.number().positive("Amount must be positive").multipleOf(0.01),
  transactionRef: z.string().max(200).optional(),
  upiId: z.string().max(100).optional(),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

// ─── Payment Method Config (Admin) ──────────
export const updatePaymentMethodConfigSchema = z.object({
  method: paymentMethodEnum,
  isEnabled: z.boolean(),
  upiId: z.string().max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type UpdatePaymentMethodConfigInput = z.infer<typeof updatePaymentMethodConfigSchema>;
