import { z } from "zod";

// ─── Floor ───────────────────────────────────
export const createFloorSchema = z.object({
  name: z.string().min(1, "Floor name is required").max(100),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateFloorSchema = createFloorSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type UpdateFloorInput = z.infer<typeof updateFloorSchema>;

// ─── Table ───────────────────────────────────
export const tableStatusEnum = z.enum(["free", "occupied", "reserved", "dirty"]);

export const createTableSchema = z.object({
  floorId: z.string().uuid("Invalid floor"),
  label: z.string().min(1, "Table label is required").max(50),
  seats: z.number().int().min(1).max(50),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  positionZ: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const updateTableSchema = createTableSchema.partial().extend({
  id: z.string().uuid(),
  status: tableStatusEnum.optional(),
});

export type TableStatus = z.infer<typeof tableStatusEnum>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
