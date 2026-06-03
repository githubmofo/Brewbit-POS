import fs from "fs";
import path from "path";

// 1. Manually load .env variables FIRST
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").replace(/^["']|["']$/g, "").trim(); // strip quotes
        process.env[key.trim()] = value;
      }
    }
    console.log("Manually loaded .env variables successfully!");
  } else {
    console.warn(".env file not found at:", envPath);
  }
} catch (e) {
  console.error("Failed to load .env manually:", e);
}

// 2. Now dynamically import DB and schema
async function main() {
  console.log("Starting database cleanup for non-admin users...");
  try {
    const { db } = await import("../src/server/db");
    const { users, sessions, orders, orderItems, payments, tables } = await import("../src/server/db/schema");
    const { not, eq, inArray } = await import("drizzle-orm");

    // 1. Identify users to delete
    const targetUsers = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(not(eq(users.email, "deadpool47181@gmail.com")));

    if (targetUsers.length === 0) {
      console.log("No non-admin users found to delete!");
      return;
    }

    console.log("Users targeted for deletion:", targetUsers);
    const userIds = targetUsers.map((u) => u.id);

    // 2. Clear locked tables for these users
    console.log("Clearing locked tables...");
    await db
      .update(tables)
      .set({ lockedByUserId: null, lockedAt: null })
      .where(inArray(tables.lockedByUserId, userIds));

    // 3. Find all sessions for these users
    const userSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.userId, userIds));
    const sessionIds = userSessions.map((s) => s.id);

    // 4. Find all orders for these users or sessions
    const userOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        sessionIds.length > 0
          ? inArray(orders.sessionId, sessionIds)
          : undefined
      );
    const orderIds = userOrders.map((o) => o.id);

    // 5. Delete order items & payments
    if (orderIds.length > 0) {
      console.log(`Deleting ${orderIds.length} order items and payments...`);
      await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
      await db.delete(payments).where(inArray(payments.orderId, orderIds));
      console.log("Deleting orders...");
      await db.delete(orders).where(inArray(orders.id, orderIds));
    }

    // 6. Delete sessions
    if (sessionIds.length > 0) {
      console.log(`Deleting ${sessionIds.length} sessions...`);
      await db.delete(sessions).where(inArray(sessions.id, sessionIds));
    }

    // 7. Finally, delete the users
    console.log("Deleting targeted users from database...");
    await db.delete(users).where(inArray(users.id, userIds));

    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("Error during database cleanup:", error);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
