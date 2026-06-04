import { initTRPC, TRPCError } from "@trpc/server";
import { verifyToken } from "../lib/auth";
import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import superjson from "superjson";

/**
 * 1. CONTEXT CREATION
 * Generates the context for each incoming tRPC request.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Extract Clerk auth credentials (only works within Next.js runtime environment)
  let jwtUserId: string | null = null;
  let dbUser = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (token) {
      const payload = await verifyToken<{ userId: string; role: string; tokenVersion: number }>(token);
      if (payload?.userId) {
        jwtUserId = payload.userId;
        const matched = await db
          .select()
          .from(users)
          .where(eq(users.id, jwtUserId))
          .limit(1);

        if (matched.length > 0) {
          // Check token version to handle revokes
          if (matched[0].tokenVersion === payload.tokenVersion) {
            dbUser = matched[0];
          }
        }
      }
    }
  } catch (error) {
    console.error("Auth Context Resolution Failure:", error);
  }

  return {
    db,
    jwtUserId,
    user: dbUser,
    headers: opts.headers,
  };
};

/**
 * 2. INITIALIZATION
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause && error.cause.name === "ZodError" ? error.cause : null,
      },
    };
  },
});

/**
 * 3. EXPORTS & PROCEDURES
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Enforces standard session presence
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.jwtUserId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required to access this resource.",
    });
  }

  return next({
    ctx: {
      jwtUserId: ctx.jwtUserId,
      user: ctx.user,
    },
  });
});

// Enforces Admin role validation
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.jwtUserId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required to access this resource.",
    });
  }

  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrative privileges are required to perform this action.",
    });
  }

  return next({
    ctx: {
      jwtUserId: ctx.jwtUserId,
      user: ctx.user,
    },
  });
});

// Enforces Kitchen role validation (Admin or Kitchen)
export const kitchenProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.jwtUserId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required to access this resource.",
    });
  }

  if (ctx.user.role !== "kitchen" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Kitchen or Administrative access is required to perform this action.",
    });
  }

  return next({
    ctx: {
      jwtUserId: ctx.jwtUserId,
      user: ctx.user,
    },
  });
});

// Enforces Cashier role validation (Admin or Cashier)
export const cashierProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.jwtUserId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required to access this resource.",
    });
  }

  if (ctx.user.role !== "cashier" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cashier or Administrative access is required to perform this action.",
    });
  }

  return next({
    ctx: {
      jwtUserId: ctx.jwtUserId,
      user: ctx.user,
    },
  });
});
