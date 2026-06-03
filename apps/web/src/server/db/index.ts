import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// singleton pattern for postgres connection to prevent connection exhaustion in dev hot-reloads
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";
if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️ WARNING: DATABASE_URL is not set. Using local database fallback for build-time compilation.",
  );
}

const conn =
  globalForDb.conn ??
  postgres(databaseUrl, {
    max: process.env.DB_MIGRATING === "true" ? 1 : 10,
    prepare: false, // CRITICAL: Disable prepared statements for compatibility with PgBouncer transaction pooling
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
  // Log resolved database URL safely in development to ensure .env is correctly loaded
  const urlObj = new URL(databaseUrl.replace("postgresql://", "http://"));
  console.log(
    `🔌 Database initialized on host: ${urlObj.host} (Prepared statements: disabled)`,
  );
}

export const db = drizzle(conn, { schema });
export type Database = typeof db;
