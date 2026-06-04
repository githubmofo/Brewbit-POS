# Brewbit POS — Codebase Architecture

This document provides a detailed overview of the Brewbit POS architecture, file structure, and technical stack. This document is intended to help developers and AI assistants navigate the repository effectively.

## 🚀 Tech Stack

The project relies on a modern, robust tech stack designed for high performance and developer velocity.

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Styling:** Tailwind CSS v4 & Lucide React Icons
- **State Management:** Zustand (v5)
- **Data Fetching:** React Query (v5) via tRPC

### Backend
- **API Layer:** tRPC (v11) 
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** Custom JWT via `jose` and bcrypt-hashed passwords.

### Monorepo & Tooling
- **Build System:** Turborepo
- **Package Manager:** npm workspaces
- **Linting & Formatting:** Biome
- **Validation:** Zod

---

## 📂 File Structure

Brewbit POS is organized as a monorepo utilizing npm workspaces and Turborepo.

```
odoo-pos-cafe/
├── apps/
│   └── web/                   # Main Next.js application
│       ├── src/
│       │   ├── app/           # Next.js 16 App Router Routes
│       │   │   ├── (backend)/ # Admin dashboard routes (reports, products, floor-plan, etc.)
│       │   │   ├── (pos)/     # Point of Sale interface (order, floor, payment, KDS)
│       │   │   ├── api/       # tRPC endpoint (/api/trpc/[trpc])
│       │   │   ├── login/     # Custom auth pages
│       │   │   └── signup/    # Customer registration
│       │   ├── components/    # Reusable React components (auth, layout, ui)
│       │   ├── lib/           # Shared utilities (auth, trpc-client, utils)
│       │   ├── server/        # Backend Logic
│       │   │   ├── db/        # Drizzle schema, seeding, and db connection
│       │   │   └── routers/   # tRPC router definitions (auth, order, payment, product, etc.)
│       │   └── stores/        # Zustand state stores (session, pos-cart)
│       └── package.json       # App-specific dependencies
├── packages/                  # Shared packages inside the monorepo
│   ├── config/                # Shared configurations (TypeScript, Tailwind, etc.)
│   ├── ui/                    # Shared UI library components (if applicable)
│   └── validators/            # Shared Zod validation schemas
├── package.json               # Root monorepo configuration
├── turbo.json                 # Turborepo build pipeline configuration
└── README.md                  # Project instructions
```

---

## 🏛️ System Boundaries & Key Decisions

### 1. Monorepo Architecture
The codebase is split into `apps/web` and shared `packages/`. This structure allows for independent versioning and caching of internal packages while enabling shared schemas (via `@pos/validators`) across the full stack.

### 2. tRPC for End-to-End Type Safety
Brewbit avoids traditional REST APIs in favor of tRPC. All backend procedures (located in `src/server/routers/`) export types that the frontend automatically consumes. If a database schema or router changes, the frontend will raise TypeScript errors immediately if out of sync.

### 3. Separation of Concerns (App Router)
The frontend routes are grouped semantically:
- `(backend)` groups administrative tasks (Dashboard, Products, Sessions).
- `(pos)` groups the operational Point of Sale tools (Floor Map, Orders, Checkout, KDS).
- `api` is reserved purely for the tRPC handler and webhooks.

### 4. Database Schema
Drizzle ORM dictates the schema structure in `src/server/db/schema.ts`. Migrations are generated via `drizzle-kit`. Any change to the database requires generating a migration and applying it using `npm run db:migrate`.

## 🛠️ Auto-Generated Code
- `.next/` and `node_modules/` are generated during build/install and must not be edited.
- Drizzle migrations under `apps/web/supabase/migrations` (or configured out-dir) are auto-generated.
- `.turbo/` caches builds to speed up the CI/CD pipeline.
