/**
 * Brewbit POS — Database Seed Script
 *
 * Populates the database with realistic cafe data:
 * - 3 Floors, 18 Tables
 * - 14 Product Categories, ~65 Products, ~20 Variants
 * - 4-5 Dummy kitchen orders
 *
 * Usage: npx tsx src/server/db/seed.ts
 *
 * Idempotent: Checks for existing data before inserting.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// ─── Load .env manually (same as drizzle.config.ts) ──────────────────────────

function loadEnv(): void {
  // Try apps/web/.env first, then root .env
  const candidates = [
    path.resolve(__dirname, "../../../.env"), // apps/web/.env
    path.resolve(__dirname, "../../../../../.env"), // root .env
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

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Cannot seed database.");
  process.exit(1);
}

// ─── Connect ──────────────────────────────────────────────────────────────────

const conn = postgres(DATABASE_URL, { max: 1, prepare: false });
const db = drizzle(conn, { schema });

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log("\n☕ Brewbit POS — Database Seeder");
  console.log("━".repeat(50));

  // ── Clear existing data (in FK-safe order) ─────────────────────────────────
  const existingFloors = await db
    .select({ id: schema.floors.id })
    .from(schema.floors)
    .limit(1);
  if (existingFloors.length > 0) {
    console.log("\n🧹 Clearing existing data...");
    // Delete in FK-safe order: children before parents
    await conn`DELETE FROM payments`;
    await conn`DELETE FROM order_items`;
    await conn`DELETE FROM orders`;
    await conn`DELETE FROM sessions`;
    await conn`DELETE FROM product_variants`;
    await conn`DELETE FROM products`;
    await conn`DELETE FROM product_categories`;
    await conn`DELETE FROM tables`;
    await conn`DELETE FROM floors`;
    console.log("   ✓ Old data cleared");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. FLOORS
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📐 Inserting Floors...");

  const [groundFloor, firstFloor, terrace] = await db
    .insert(schema.floors)
    .values([
      { name: "Ground Floor", sortOrder: 0, isActive: true },
      { name: "First Floor", sortOrder: 1, isActive: true },
      { name: "Terrace", sortOrder: 2, isActive: true },
    ])
    .returning();

  console.log(`   ✓ 3 floors created`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. TABLES
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🍽️  Inserting Tables...");

  const tableData = [
    // Ground Floor — 8 tables
    {
      floorId: groundFloor!.id,
      label: "T1",
      seats: 2,
      positionX: 50,
      positionY: 50,
    },
    {
      floorId: groundFloor!.id,
      label: "T2",
      seats: 2,
      positionX: 200,
      positionY: 50,
    },
    {
      floorId: groundFloor!.id,
      label: "T3",
      seats: 4,
      positionX: 350,
      positionY: 50,
    },
    {
      floorId: groundFloor!.id,
      label: "T4",
      seats: 4,
      positionX: 50,
      positionY: 200,
    },
    {
      floorId: groundFloor!.id,
      label: "T5",
      seats: 6,
      positionX: 200,
      positionY: 200,
    },
    {
      floorId: groundFloor!.id,
      label: "T6",
      seats: 4,
      positionX: 350,
      positionY: 200,
    },
    {
      floorId: groundFloor!.id,
      label: "T7",
      seats: 2,
      positionX: 50,
      positionY: 350,
    },
    {
      floorId: groundFloor!.id,
      label: "T8",
      seats: 6,
      positionX: 200,
      positionY: 350,
    },
    // First Floor — 6 tables
    {
      floorId: firstFloor!.id,
      label: "T9",
      seats: 2,
      positionX: 50,
      positionY: 50,
    },
    {
      floorId: firstFloor!.id,
      label: "T10",
      seats: 4,
      positionX: 200,
      positionY: 50,
    },
    {
      floorId: firstFloor!.id,
      label: "T11",
      seats: 4,
      positionX: 350,
      positionY: 50,
    },
    {
      floorId: firstFloor!.id,
      label: "T12",
      seats: 2,
      positionX: 50,
      positionY: 200,
    },
    {
      floorId: firstFloor!.id,
      label: "T13",
      seats: 4,
      positionX: 200,
      positionY: 200,
    },
    {
      floorId: firstFloor!.id,
      label: "T14",
      seats: 2,
      positionX: 350,
      positionY: 200,
    },
    // Terrace — 4 tables
    {
      floorId: terrace!.id,
      label: "T15",
      seats: 4,
      positionX: 50,
      positionY: 50,
    },
    {
      floorId: terrace!.id,
      label: "T16",
      seats: 6,
      positionX: 250,
      positionY: 50,
    },
    {
      floorId: terrace!.id,
      label: "T17",
      seats: 8,
      positionX: 50,
      positionY: 250,
    },
    {
      floorId: terrace!.id,
      label: "T18",
      seats: 4,
      positionX: 250,
      positionY: 250,
    },
  ];

  const insertedTables = await db
    .insert(schema.tables)
    .values(
      tableData.map((t) => ({
        ...t,
        positionZ: 0,
        status: "free" as const,
        isActive: true,
      })),
    )
    .returning();

  console.log(`   ✓ ${insertedTables.length} tables created`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. PRODUCT CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📂 Inserting Categories...");

  const categoryEntries = [
    { name: "Pizza", color: "#E74C3C", sortOrder: 0 },
    { name: "Pasta", color: "#E67E22", sortOrder: 1 },
    { name: "Burgers", color: "#F39C12", sortOrder: 2 },
    { name: "Sandwiches", color: "#27AE60", sortOrder: 3 },
    { name: "Soups", color: "#2ECC71", sortOrder: 4 },
    { name: "Beverages", color: "#3498DB", sortOrder: 5 },
    { name: "Desserts", color: "#9B59B6", sortOrder: 6 },
    { name: "Milkshakes", color: "#E91E63", sortOrder: 7 },
    { name: "Quesadillas", color: "#FF5722", sortOrder: 8 },
    { name: "Fries", color: "#FF9800", sortOrder: 9 },
    { name: "Frankies", color: "#8BC34A", sortOrder: 10 },
    { name: "Soft Drinks", color: "#00BCD4", sortOrder: 11 },
    { name: "Burritos", color: "#795548", sortOrder: 12 },
    { name: "Rice Bowls", color: "#607D8B", sortOrder: 13 },
  ];

  const insertedCategories = await db
    .insert(schema.productCategories)
    .values(categoryEntries.map((c) => ({ ...c, isActive: true })))
    .returning();

  // Build a lookup map: name → id
  const catMap: Record<string, string> = {};
  for (const cat of insertedCategories) {
    catMap[cat.name] = cat.id;
  }

  console.log(`   ✓ ${insertedCategories.length} categories created`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PRODUCTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🍕 Inserting Products...");

  interface ProductSeed {
    name: string;
    description: string;
    price: string;
    categoryName: string;
    taxRate?: string;
    variants?: {
      attributeName: string;
      attributeValue: string;
      extraPrice: string;
    }[];
  }

  const productSeeds: ProductSeed[] = [
    // ── Pizza ────────────────────────────────────────────────────────────
    {
      name: "Margherita Pizza",
      description: "Classic tomato sauce, fresh mozzarella, and basil leaves",
      price: "199.00",
      categoryName: "Pizza",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "80.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Large",
          extraPrice: "150.00",
        },
      ],
    },
    {
      name: "Farmhouse Pizza",
      description:
        "Bell peppers, mushrooms, onions, olives, and corn on a cheesy base",
      price: "249.00",
      categoryName: "Pizza",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "80.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Large",
          extraPrice: "150.00",
        },
      ],
    },
    {
      name: "Pepperoni Pizza",
      description: "Loaded with spicy pepperoni slices and extra mozzarella",
      price: "299.00",
      categoryName: "Pizza",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "80.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Large",
          extraPrice: "150.00",
        },
      ],
    },
    {
      name: "BBQ Chicken Pizza",
      description:
        "Smoky BBQ sauce, grilled chicken, red onions, and jalapeños",
      price: "349.00",
      categoryName: "Pizza",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "80.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Large",
          extraPrice: "150.00",
        },
      ],
    },
    {
      name: "Paneer Tikka Pizza",
      description: "Tandoori paneer, capsicum, onion rings, and mint drizzle",
      price: "279.00",
      categoryName: "Pizza",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "80.00",
        },
        {
          attributeName: "Size",
          attributeValue: "Large",
          extraPrice: "150.00",
        },
      ],
    },

    // ── Pasta ────────────────────────────────────────────────────────────
    {
      name: "Alfredo Pasta",
      description: "Creamy white sauce with garlic, parmesan, and herbs",
      price: "219.00",
      categoryName: "Pasta",
      taxRate: "5.00",
    },
    {
      name: "Arrabiata Pasta",
      description: "Spicy tomato sauce with chili flakes and fresh basil",
      price: "199.00",
      categoryName: "Pasta",
      taxRate: "5.00",
    },
    {
      name: "Pesto Pasta",
      description: "Fresh basil pesto with pine nuts and parmesan",
      price: "249.00",
      categoryName: "Pasta",
      taxRate: "5.00",
    },
    {
      name: "Mac & Cheese",
      description: "Rich and creamy three-cheese macaroni baked golden",
      price: "229.00",
      categoryName: "Pasta",
      taxRate: "5.00",
    },
    {
      name: "Aglio Olio",
      description: "Spaghetti tossed in olive oil, garlic, and chili flakes",
      price: "179.00",
      categoryName: "Pasta",
      taxRate: "5.00",
    },

    // ── Burgers ──────────────────────────────────────────────────────────
    {
      name: "Classic Veg Burger",
      description: "Crispy veggie patty with lettuce, tomato, and house sauce",
      price: "129.00",
      categoryName: "Burgers",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Extra",
          attributeValue: "Extra Cheese",
          extraPrice: "30.00",
        },
        {
          attributeName: "Extra",
          attributeValue: "Double Patty",
          extraPrice: "80.00",
        },
      ],
    },
    {
      name: "Chicken Zinger Burger",
      description: "Spicy crispy chicken fillet with coleslaw and mayo",
      price: "199.00",
      categoryName: "Burgers",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Extra",
          attributeValue: "Extra Cheese",
          extraPrice: "30.00",
        },
        {
          attributeName: "Extra",
          attributeValue: "Double Patty",
          extraPrice: "80.00",
        },
      ],
    },
    {
      name: "Paneer Crunch Burger",
      description: "Crispy paneer patty with spiced mayo and pickled onions",
      price: "169.00",
      categoryName: "Burgers",
      taxRate: "5.00",
    },
    {
      name: "Double Stack Burger",
      description:
        "Two beef-style patties, cheddar, bacon strips, and BBQ sauce",
      price: "279.00",
      categoryName: "Burgers",
      taxRate: "5.00",
    },
    {
      name: "Mushroom Swiss Burger",
      description: "Sautéed mushrooms, Swiss cheese, and truffle aioli",
      price: "229.00",
      categoryName: "Burgers",
      taxRate: "5.00",
    },

    // ── Sandwiches ───────────────────────────────────────────────────────
    {
      name: "Club Sandwich",
      description: "Triple-decker with grilled chicken, egg, lettuce, and mayo",
      price: "179.00",
      categoryName: "Sandwiches",
      taxRate: "5.00",
    },
    {
      name: "Grilled Cheese Sandwich",
      description: "Golden grilled bread with melted cheddar and mozzarella",
      price: "129.00",
      categoryName: "Sandwiches",
      taxRate: "5.00",
    },
    {
      name: "Paneer Tikka Sandwich",
      description: "Spiced paneer with mint chutney and crispy onions",
      price: "149.00",
      categoryName: "Sandwiches",
      taxRate: "5.00",
    },
    {
      name: "Chicken Mayo Sandwich",
      description: "Shredded chicken with mayo, celery, and mixed greens",
      price: "169.00",
      categoryName: "Sandwiches",
      taxRate: "5.00",
    },
    {
      name: "Veggie Delight Sandwich",
      description: "Fresh cucumber, tomato, lettuce, and hummus spread",
      price: "99.00",
      categoryName: "Sandwiches",
      taxRate: "5.00",
    },

    // ── Soups ────────────────────────────────────────────────────────────
    {
      name: "Tomato Soup",
      description: "Classic creamy tomato bisque with croutons and basil oil",
      price: "99.00",
      categoryName: "Soups",
      taxRate: "5.00",
    },
    {
      name: "Sweet Corn Soup",
      description: "Silky sweet corn chowder with a hint of pepper",
      price: "109.00",
      categoryName: "Soups",
      taxRate: "5.00",
    },
    {
      name: "Hot & Sour Soup",
      description: "Tangy Indo-Chinese style with vegetables and tofu",
      price: "119.00",
      categoryName: "Soups",
      taxRate: "5.00",
    },
    {
      name: "Cream of Mushroom Soup",
      description: "Velvety mushroom soup with garlic bread on the side",
      price: "129.00",
      categoryName: "Soups",
      taxRate: "5.00",
    },
    {
      name: "Minestrone Soup",
      description: "Hearty Italian vegetable soup with beans and pasta",
      price: "139.00",
      categoryName: "Soups",
      taxRate: "5.00",
    },

    // ── Beverages ────────────────────────────────────────────────────────
    {
      name: "Espresso",
      description: "Strong single-shot espresso, rich and bold",
      price: "79.00",
      categoryName: "Beverages",
      taxRate: "5.00",
      variants: [
        { attributeName: "Size", attributeValue: "Single", extraPrice: "0.00" },
        {
          attributeName: "Size",
          attributeValue: "Double",
          extraPrice: "40.00",
        },
      ],
    },
    {
      name: "Cappuccino",
      description: "Espresso with steamed milk and a thick foam layer",
      price: "129.00",
      categoryName: "Beverages",
      taxRate: "5.00",
      variants: [
        { attributeName: "Size", attributeValue: "Small", extraPrice: "0.00" },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "30.00",
        },
        { attributeName: "Size", attributeValue: "Large", extraPrice: "50.00" },
      ],
    },
    {
      name: "Café Latte",
      description: "Smooth espresso blended with steamed milk",
      price: "139.00",
      categoryName: "Beverages",
      taxRate: "5.00",
      variants: [
        { attributeName: "Size", attributeValue: "Small", extraPrice: "0.00" },
        {
          attributeName: "Size",
          attributeValue: "Medium",
          extraPrice: "30.00",
        },
        { attributeName: "Size", attributeValue: "Large", extraPrice: "50.00" },
      ],
    },
    {
      name: "Green Tea",
      description: "Premium Japanese green tea, lightly steeped",
      price: "89.00",
      categoryName: "Beverages",
      taxRate: "5.00",
    },
    {
      name: "Hot Chocolate",
      description: "Rich Belgian cocoa with whipped cream and marshmallows",
      price: "149.00",
      categoryName: "Beverages",
      taxRate: "5.00",
    },

    // ── Desserts ─────────────────────────────────────────────────────────
    {
      name: "Chocolate Brownie",
      description: "Warm fudgy brownie served with vanilla ice cream",
      price: "149.00",
      categoryName: "Desserts",
      taxRate: "5.00",
    },
    {
      name: "New York Cheesecake",
      description: "Classic creamy cheesecake with berry compote",
      price: "199.00",
      categoryName: "Desserts",
      taxRate: "5.00",
    },
    {
      name: "Tiramisu",
      description: "Italian coffee-soaked ladyfingers with mascarpone cream",
      price: "229.00",
      categoryName: "Desserts",
      taxRate: "5.00",
    },
    {
      name: "Gulab Jamun",
      description: "Soft milk dumplings soaked in rose-cardamom sugar syrup",
      price: "129.00",
      categoryName: "Desserts",
      taxRate: "5.00",
    },
    {
      name: "Ice Cream Sundae",
      description: "Three scoops with chocolate sauce, nuts, and cherry on top",
      price: "179.00",
      categoryName: "Desserts",
      taxRate: "5.00",
    },

    // ── Milkshakes ───────────────────────────────────────────────────────
    {
      name: "Chocolate Milkshake",
      description: "Rich Belgian chocolate blended with ice cream and milk",
      price: "169.00",
      categoryName: "Milkshakes",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        { attributeName: "Size", attributeValue: "Large", extraPrice: "50.00" },
      ],
    },
    {
      name: "Strawberry Milkshake",
      description: "Fresh strawberries blended with cream and vanilla",
      price: "169.00",
      categoryName: "Milkshakes",
      taxRate: "5.00",
      variants: [
        {
          attributeName: "Size",
          attributeValue: "Regular",
          extraPrice: "0.00",
        },
        { attributeName: "Size", attributeValue: "Large", extraPrice: "50.00" },
      ],
    },
    {
      name: "Oreo Milkshake",
      description: "Crushed Oreo cookies blended with vanilla ice cream",
      price: "189.00",
      categoryName: "Milkshakes",
      taxRate: "5.00",
    },
    {
      name: "Mango Milkshake",
      description: "Alphonso mango pulp blended with chilled milk and cream",
      price: "179.00",
      categoryName: "Milkshakes",
      taxRate: "5.00",
    },
    {
      name: "Cold Coffee",
      description:
        "Chilled coffee with ice cream, whipped cream, and chocolate drizzle",
      price: "149.00",
      categoryName: "Milkshakes",
      taxRate: "5.00",
    },

    // ── Quesadillas ──────────────────────────────────────────────────────
    {
      name: "Cheese Quesadilla",
      description:
        "Flour tortilla stuffed with melted cheddar and mozzarella mix",
      price: "159.00",
      categoryName: "Quesadillas",
      taxRate: "5.00",
    },
    {
      name: "Paneer Quesadilla",
      description: "Spiced paneer crumble with peppers and chipotle sauce",
      price: "189.00",
      categoryName: "Quesadillas",
      taxRate: "5.00",
    },
    {
      name: "Chicken Quesadilla",
      description: "Shredded grilled chicken with jalapeños and salsa",
      price: "219.00",
      categoryName: "Quesadillas",
      taxRate: "5.00",
    },
    {
      name: "Mushroom Quesadilla",
      description: "Sautéed mushrooms with caramelized onions and cheese",
      price: "179.00",
      categoryName: "Quesadillas",
      taxRate: "5.00",
    },

    // ── Fries ────────────────────────────────────────────────────────────
    {
      name: "Classic Fries",
      description: "Golden crispy French fries with ketchup",
      price: "99.00",
      categoryName: "Fries",
      taxRate: "5.00",
    },
    {
      name: "Peri Peri Fries",
      description: "Fries tossed in spicy peri peri seasoning",
      price: "129.00",
      categoryName: "Fries",
      taxRate: "5.00",
    },
    {
      name: "Cheese Fries",
      description: "Crispy fries loaded with nacho cheese sauce",
      price: "149.00",
      categoryName: "Fries",
      taxRate: "5.00",
    },
    {
      name: "Loaded Fries",
      description:
        "Fries topped with cheese, jalapeños, sour cream, and bacon bits",
      price: "189.00",
      categoryName: "Fries",
      taxRate: "5.00",
    },
    {
      name: "Masala Fries",
      description: "Indian-spiced fries with chaat masala and mint chutney",
      price: "119.00",
      categoryName: "Fries",
      taxRate: "5.00",
    },

    // ── Frankies ─────────────────────────────────────────────────────────
    {
      name: "Paneer Frankie",
      description: "Spiced paneer wrap with onions, chutney, and crispy sev",
      price: "119.00",
      categoryName: "Frankies",
      taxRate: "5.00",
    },
    {
      name: "Chicken Tikka Frankie",
      description: "Tandoori chicken pieces with mint mayo and pickled onions",
      price: "149.00",
      categoryName: "Frankies",
      taxRate: "5.00",
    },
    {
      name: "Egg Frankie",
      description: "Masala egg wrap with green chutney and crispy onions",
      price: "99.00",
      categoryName: "Frankies",
      taxRate: "5.00",
    },
    {
      name: "Veggie Frankie",
      description: "Mixed vegetable filling with schezwan sauce and cheese",
      price: "109.00",
      categoryName: "Frankies",
      taxRate: "5.00",
    },
    {
      name: "Schezwan Frankie",
      description: "Spicy schezwan noodle wrap with crunchy veggies",
      price: "129.00",
      categoryName: "Frankies",
      taxRate: "5.00",
    },

    // ── Soft Drinks ──────────────────────────────────────────────────────
    {
      name: "Cola",
      description: "Chilled classic cola with ice and lemon slice",
      price: "49.00",
      categoryName: "Soft Drinks",
      taxRate: "12.00",
    },
    {
      name: "Lemon Soda",
      description: "Fresh lime squeezed with soda and a pinch of salt",
      price: "69.00",
      categoryName: "Soft Drinks",
      taxRate: "12.00",
    },
    {
      name: "Virgin Mojito",
      description: "Muddled mint and lime with soda and sugar syrup",
      price: "99.00",
      categoryName: "Soft Drinks",
      taxRate: "12.00",
    },
    {
      name: "Iced Tea",
      description: "Chilled peach iced tea with lemon wedge",
      price: "89.00",
      categoryName: "Soft Drinks",
      taxRate: "12.00",
    },
    {
      name: "Mango Lassi",
      description: "Thick mango yogurt smoothie with a cardamom finish",
      price: "109.00",
      categoryName: "Soft Drinks",
      taxRate: "5.00",
    },

    // ── Burritos ─────────────────────────────────────────────────────────
    {
      name: "Bean & Cheese Burrito",
      description:
        "Refried beans, cheddar, rice, and pico de gallo in a flour tortilla",
      price: "169.00",
      categoryName: "Burritos",
      taxRate: "5.00",
    },
    {
      name: "Chicken Burrito",
      description:
        "Grilled chicken with Mexican rice, beans, cheese, and sour cream",
      price: "229.00",
      categoryName: "Burritos",
      taxRate: "5.00",
    },
    {
      name: "Paneer Burrito",
      description: "Spiced cottage cheese with corn salsa and guacamole",
      price: "199.00",
      categoryName: "Burritos",
      taxRate: "5.00",
    },
    {
      name: "Veggie Burrito",
      description:
        "Grilled peppers, onions, corn, and black beans with salsa verde",
      price: "179.00",
      categoryName: "Burritos",
      taxRate: "5.00",
    },
    {
      name: "Mexican Burrito",
      description: "Loaded with jalapeños, salsa roja, rice, and seasoned meat",
      price: "249.00",
      categoryName: "Burritos",
      taxRate: "5.00",
    },

    // ── Rice Bowls ───────────────────────────────────────────────────────
    {
      name: "Veg Fried Rice Bowl",
      description: "Wok-tossed rice with mixed vegetables and soy sauce",
      price: "159.00",
      categoryName: "Rice Bowls",
      taxRate: "5.00",
    },
    {
      name: "Teriyaki Chicken Bowl",
      description:
        "Grilled teriyaki chicken on steamed rice with sesame and scallions",
      price: "229.00",
      categoryName: "Rice Bowls",
      taxRate: "5.00",
    },
    {
      name: "Mexican Rice Bowl",
      description: "Cilantro lime rice with beans, corn salsa, and guacamole",
      price: "199.00",
      categoryName: "Rice Bowls",
      taxRate: "5.00",
    },
    {
      name: "Paneer Butter Rice Bowl",
      description: "Creamy paneer butter masala served over basmati rice",
      price: "209.00",
      categoryName: "Rice Bowls",
      taxRate: "5.00",
    },
    {
      name: "Schezwan Rice Bowl",
      description:
        "Spicy schezwan fried rice with crispy vegetables and chili oil",
      price: "179.00",
      categoryName: "Rice Bowls",
      taxRate: "5.00",
    },
  ];

  // Insert all products
  const productIdMap: Map<string, string> = new Map(); // productName → productId

  for (const p of productSeeds) {
    const categoryId = catMap[p.categoryName];
    if (!categoryId) {
      console.warn(
        `   ⚠ Category "${p.categoryName}" not found, skipping ${p.name}`,
      );
      continue;
    }

    const [inserted] = await db
      .insert(schema.products)
      .values({
        categoryId,
        name: p.name,
        description: p.description,
        price: p.price,
        unit: "pcs",
        taxRate: p.taxRate ?? "5.00",
        imageUrl: "",
        isActive: true,
      })
      .returning();

    productIdMap.set(p.name, inserted!.id);

    // Insert variants if any
    if (p.variants && p.variants.length > 0) {
      await db.insert(schema.productVariants).values(
        p.variants.map((v) => ({
          productId: inserted!.id,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          extraPrice: v.extraPrice,
          isActive: true,
        })),
      );
    }
  }

  const totalVariants = productSeeds.reduce(
    (sum, p) => sum + (p.variants?.length ?? 0),
    0,
  );
  console.log(`   ✓ ${productSeeds.length} products created`);
  console.log(`   ✓ ${totalVariants} variants created`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. KITCHEN DUMMY ORDERS (4-5 orders)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🎫 Inserting Kitchen Dummy Orders...");

  // Find the admin user
  const adminUser = await db.query.users.findFirst({
    where: eq(schema.users.role, "admin"),
  });

  if (!adminUser) {
    console.log(
      "   ⚠ No admin user found. Sign in as admin@brewbit.com first, then re-run.",
    );
    console.log("   Skipping kitchen dummy orders.");
  } else {
    // Create a session for the dummy orders
    const [dummySession] = await db
      .insert(schema.sessions)
      .values({
        userId: adminUser.id,
        status: "open",
        openingBalance: "5000.00",
      })
      .returning();

    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, "");

    // Helper to create an order with items
    async function createDummyOrder(
      tableIndex: number,
      orderNum: number,
      orderStatus: "confirmed" | "sent_to_kitchen" | "completed",
      items: {
        productName: string;
        quantity: number;
        kitchenStatus: "to_cook" | "preparing" | "done";
      }[],
    ): Promise<void> {
      const table = insertedTables[tableIndex];
      if (!table) return;

      const orderNumber = `ORD-${dateCode}-${orderNum.toString().padStart(4, "0")}`;

      let subtotal = 0;
      let taxTotal = 0;

      // Calculate totals first
      for (const item of items) {
        const productId = productIdMap.get(item.productName);
        if (!productId) continue;
        const prod = productSeeds.find((p) => p.name === item.productName);
        if (!prod) continue;
        const price = parseFloat(prod.price);
        const tax = price * (parseFloat(prod.taxRate ?? "5") / 100);
        subtotal += price * item.quantity;
        taxTotal += tax * item.quantity;
      }

      const [order] = await db
        .insert(schema.orders)
        .values({
          sessionId: dummySession!.id,
          tableId: table.id,
          userId: adminUser!.id,
          orderNumber,
          status: orderStatus,
          subtotal: subtotal.toFixed(2),
          taxTotal: taxTotal.toFixed(2),
          total: (subtotal + taxTotal).toFixed(2),
          notes: "",
        })
        .returning();

      // Mark table as occupied
      await db
        .update(schema.tables)
        .set({ status: "occupied" })
        .where(eq(schema.tables.id, table.id));

      // Insert order items
      for (const item of items) {
        const productId = productIdMap.get(item.productName);
        if (!productId) continue;
        const prod = productSeeds.find((p) => p.name === item.productName);
        if (!prod) continue;
        const unitPrice = parseFloat(prod.price);

        await db.insert(schema.orderItems).values({
          orderId: order!.id,
          productId,
          variantId: null,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: (unitPrice * item.quantity).toFixed(2),
          notes: "",
          kitchenStatus: item.kitchenStatus,
        });
      }
    }

    // Order 1: Sent to kitchen — mixed statuses
    await createDummyOrder(0, 1, "sent_to_kitchen", [
      {
        productName: "Margherita Pizza",
        quantity: 2,
        kitchenStatus: "preparing",
      },
      { productName: "Classic Fries", quantity: 1, kitchenStatus: "to_cook" },
      { productName: "Cola", quantity: 2, kitchenStatus: "done" },
    ]);

    // Order 2: Sent to kitchen — mostly done
    await createDummyOrder(2, 2, "sent_to_kitchen", [
      {
        productName: "Chicken Zinger Burger",
        quantity: 1,
        kitchenStatus: "done",
      },
      { productName: "Cheese Fries", quantity: 1, kitchenStatus: "preparing" },
      {
        productName: "Chocolate Milkshake",
        quantity: 2,
        kitchenStatus: "done",
      },
    ]);

    // Order 3: Confirmed — all to_cook
    await createDummyOrder(4, 3, "confirmed", [
      { productName: "Alfredo Pasta", quantity: 1, kitchenStatus: "to_cook" },
      { productName: "Tomato Soup", quantity: 2, kitchenStatus: "to_cook" },
      { productName: "Club Sandwich", quantity: 1, kitchenStatus: "to_cook" },
    ]);

    // Order 4: Sent to kitchen — all done (ready for pickup)
    await createDummyOrder(6, 4, "sent_to_kitchen", [
      { productName: "Paneer Burrito", quantity: 1, kitchenStatus: "done" },
      {
        productName: "Veg Fried Rice Bowl",
        quantity: 1,
        kitchenStatus: "done",
      },
      { productName: "Virgin Mojito", quantity: 2, kitchenStatus: "done" },
    ]);

    // Order 5: Completed — all done
    await createDummyOrder(8, 5, "completed", [
      { productName: "Chicken Quesadilla", quantity: 2, kitchenStatus: "done" },
      { productName: "Loaded Fries", quantity: 1, kitchenStatus: "done" },
      { productName: "Mango Lassi", quantity: 2, kitchenStatus: "done" },
    ]);

    console.log(`   ✓ 5 dummy orders created with items`);
    console.log(`   ✓ 5 tables marked as occupied`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "━".repeat(50));
  console.log("✅ Seed complete!");
  console.log(`   📐 3 Floors`);
  console.log(`   🍽️  ${insertedTables.length} Tables`);
  console.log(`   📂 ${insertedCategories.length} Categories`);
  console.log(`   🍕 ${productSeeds.length} Products`);
  console.log(`   🔄 ${totalVariants} Variants`);
  console.log(`   🎫 ${adminUser ? "5" : "0"} Kitchen Orders`);
  console.log("━".repeat(50) + "\n");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seed()
  .then(() => {
    conn.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    conn.end();
    process.exit(1);
  });
