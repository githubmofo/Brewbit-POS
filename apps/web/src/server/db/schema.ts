import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── CUSTOM ENUMS ─────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "cashier",
  "kitchen",
  "customer",
]);
export const tableStatusEnum = pgEnum("table_status", [
  "free",
  "occupied",
  "reserved",
  "dirty",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "sent_to_kitchen",
  "completed",
  "cancelled",
]);
export const kitchenStatusEnum = pgEnum("kitchen_status", [
  "pending",
  "to_cook",
  "preparing",
  "done",
]);
export const itemPriorityEnum = pgEnum("item_priority", [
  "normal",
  "important",
  "not_important",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "digital",
  "upi_qr",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "confirmed",
  "failed",
  "refunded",
]);
export const sessionStatusEnum = pgEnum("session_status", ["open", "closed"]);

// ─── TABLES ───────────────────────────────────────────────────────────────────

// 1. Users (synchronized from Clerk webhooks)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  passwordHash: text("password_hash").notNull().default(""),
  tokenVersion: integer("token_version").notNull().default(0),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("cashier"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 2. Floors
export const floors = pgTable("floors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 3. Tables
export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  floorId: uuid("floor_id")
    .notNull()
    .references(() => floors.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  seats: integer("seats").notNull().default(2),
  positionX: doublePrecision("position_x").notNull().default(0),
  positionY: doublePrecision("position_y").notNull().default(0),
  positionZ: doublePrecision("position_z").notNull().default(0),
  status: tableStatusEnum("status").notNull().default("free"),
  isActive: boolean("is_active").notNull().default(true),
  lockedByUserId: uuid("locked_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 4. Product Categories
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#E28743"), // Default to Warm Amber accent
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 5. Products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => productCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("pcs"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0.00"),
  imageUrl: text("image_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 6. Product Variants (e.g. Extra Shot, Almond Milk, etc.)
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  attributeName: text("attribute_name").notNull(), // e.g. "Milk"
  attributeValue: text("attribute_value").notNull(), // e.g. "Oat Milk"
  extraPrice: numeric("extra_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
});

// 7. Sessions (Cash registers opening & closing)
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  status: sessionStatusEnum("status").notNull().default("open"),
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// 8. Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "restrict" }),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "restrict" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  orderNumber: text("order_number").notNull().unique(),
  status: orderStatusEnum("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  taxTotal: numeric("tax_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  total: numeric("total", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 9. Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  notes: text("notes").notNull().default(""),
  kitchenStatus: kitchenStatusEnum("kitchen_status")
    .notNull()
    .default("pending"),
  priority: itemPriorityEnum("priority").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 10. Payments
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  transactionRef: text("transaction_ref"), // For digital card payments or manual validation
  upiId: text("upi_id"), // For UPI QR payments
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 11. Payment Methods Config (For configuring merchant credentials like UPI)
export const paymentMethodsConfig = pgTable("payment_methods_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  method: paymentMethodEnum("method").notNull().unique(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  upiId: text("upi_id"), // Default VPA for store UPI QR (e.g. store@upi)
  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  orders: many(orders),
}));

export const floorsRelations = relations(floors, ({ many }) => ({
  tables: many(tables),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  floor: one(floors, {
    fields: [tables.floorId],
    references: [floors.id],
  }),
  lockedByUser: one(users, {
    fields: [tables.lockedByUserId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ many }) => ({
    products: many(products),
  }),
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  variants: many(productVariants),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    orderItems: many(orderItems),
  }),
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(sessions, {
    fields: [orders.sessionId],
    references: [sessions.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));
