import fs from "fs";
const env = fs.readFileSync(".env", "utf8");
env.split("\n").forEach(line => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) process.env[key.trim()] = vals.join("=").trim().replace(/['"]/g, '');
});

async function main() {
  const { db } = await import("./src/server/db/index.js");
  const { users } = await import("./src/server/db/schema.js");
  const { eq } = await import("drizzle-orm");
  const bcrypt = await import("bcryptjs");

  try {
    const defaultPasswordHash = await bcrypt.hash("password123", 10);
    const result = await db.update(users).set({ passwordHash: defaultPasswordHash }).where(eq(users.passwordHash, ""));
    console.log("Updated users with empty passwords to 'password123'.");
  } catch (err) {
    console.error("Query failed:", err);
  }
}

main();
