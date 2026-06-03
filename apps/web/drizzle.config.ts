import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// Zero-dependency environment variable parser to resolve root .env in Turborepo workspaces
function loadRootEnv() {
  try {
    const envPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split(/\r?\n/);

      for (const line of lines) {
        // Match standard key=value patterns, ignoring comments
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();

          // Unwrap double/single quotes if present
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }

          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load root .env file:", err);
  }
}

loadRootEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn(
    "⚠️ WARNING: DATABASE_URL is not set. Drizzle Kit commands will fail.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "",
  },
});
