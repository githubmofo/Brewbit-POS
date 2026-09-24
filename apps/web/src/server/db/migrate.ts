import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

function loadEnv(): void {
  const candidates = [
    path.resolve(__dirname, "../../../../.env"), // root .env
    path.resolve(__dirname, "../../../.env"), // apps/web/.env
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1]!.trim();
          let val = match[2]!.trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function main() {
  loadEnv();
  
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL or DIRECT_URL is required for migrations.");
    process.exit(1);
  }

  console.log("Running migrations...");
  const migrationClient = postgres(dbUrl, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  try {
    await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
    console.log("Migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error applying migrations:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();
