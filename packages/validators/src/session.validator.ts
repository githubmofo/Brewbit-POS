import { z } from "zod";

// ─── Session ─────────────────────────────────
export const openSessionSchema = z.object({
  openingBalance: z.number().min(0).multipleOf(0.01).default(0),
});

export const closeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  closingBalance: z.number().min(0).multipleOf(0.01),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
