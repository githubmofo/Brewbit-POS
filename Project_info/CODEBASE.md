# Brewbit POS — Architecture & Technical Specifications

This document outlines the system architecture, file structure, and technical foundation of the Brewbit POS platform. It serves as a comprehensive reference for the engineering team to understand the core technologies and design patterns employed in the repository.

## 🚀 Technology Stack

Brewbit POS is built on a modern, robust technology stack designed to maximize performance, scalability, and developer experience.

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
- **Authentication:** Custom JWT-based session management using `jose` with bcrypt-hashed passwords.

### Monorepo & Build Tooling
- **Build System:** Turborepo
- **Package Management:** npm workspaces
- **Linting & Formatting:** Biome
- **Validation:** Zod

---

## 📂 Repository Structure

The project is structured as a scalable monorepo utilizing npm workspaces and Turborepo. This approach allows for clean separation of concerns and independent versioning of internal packages.

```text
odoo-pos-cafe/
├── apps/
│   └── web/                   # Primary Next.js application
│       ├── src/
│       │   ├── app/           # Next.js 16 App Router interface
│       │   │   ├── (backend)/ # Administrative dashboard (reports, products, floor-plan)
│       │   │   ├── (pos)/     # Point of Sale operational interface (orders, checkout, KDS)
│       │   │   ├── api/       # tRPC endpoints (/api/trpc/[trpc])
│       │   │   ├── login/     # Authentication interface
│       │   │   └── signup/    # Customer onboarding
│       │   ├── components/    # Reusable modular UI and layout components
│       │   ├── lib/           # Core utilities and shared helpers
│       │   ├── server/        # Backend application logic
│       │   │   ├── db/        # Drizzle schemas, connection pooling, and seeding
│       │   │   └── routers/   # tRPC router controllers (auth, order, payment, product, etc.)
│       │   └── stores/        # Global Zustand state controllers
│       └── package.json       # App-specific dependencies
├── packages/                  # Internal shared packages
│   ├── config/                # Centralized configurations (TypeScript, Tailwind)
│   ├── ui/                    # Shared component library
│   └── validators/            # Shared Zod validation schemas
├── package.json               # Root monorepo configuration
├── turbo.json                 # Turborepo build pipeline definition
└── README.md                  # Project documentation
```

---

## 🏛️ System Architecture & Engineering Principles

### 1. Monorepo Design
The application is segmented into a primary `apps/web` application and shared internal `packages/`. This architecture promotes strict isolation of logic, allows for shared typing (such as `@pos/validators`) across the entire stack, and leverages advanced caching mechanisms during the build pipeline.

### 2. End-to-End Type Safety via tRPC
Brewbit POS utilizes tRPC to establish a strictly typed API boundary, circumventing the need for traditional REST endpoints or GraphQL boilerplate. Backend procedures inherently export type signatures that the frontend consumes directly. Any discrepancy between the database schema, router logic, and client implementation is caught immediately at compile-time.

### 3. Semantic Routing Separation (App Router)
The frontend routing architecture is semantically segregated to ensure security and logical grouping:
- The `(backend)` route group handles administrative and managerial interfaces (Analytics, Product Management, Floor Configurations).
- The `(pos)` route group encapsulates the operational interfaces required by on-floor staff (Table Management, Order Processing, Kitchen Display System).
- The `api` directory is strictly reserved for the tRPC handler and external webhooks.

### 4. Database Schema and Migrations
The relational database structure is managed exclusively through Drizzle ORM, with definitions centralized in `src/server/db/schema.ts`. Database schema evolutions are safely executed through versioned migration files, ensuring deterministic deployments and data integrity.
