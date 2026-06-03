import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../../lib/passwords";
import { signAccessToken, signRefreshToken, verifyToken } from "../../lib/auth";
import { cookies } from "next/headers";

const TOKEN_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user || null;
  }),
  
  register: publicProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["admin", "cashier", "kitchen", "customer"]).optional().default("customer"),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
      }
      
      const hashedPassword = await hashPassword(input.password);
      
      const inserted = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash: hashedPassword,
        role: input.role,
      }).returning();
      
      const user = inserted[0];
      
      const accessToken = await signAccessToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
      const refreshToken = await signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
      
      const cookieStore = await cookies();
      cookieStore.set("access_token", accessToken, { ...TOKEN_OPTS, maxAge: 15 * 60 });
      cookieStore.set("refresh_token", refreshToken, { ...TOKEN_OPTS, maxAge: 7 * 24 * 60 * 60 });
      
      return user;
    }),
    
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const matched = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (matched.length === 0) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      
      const user = matched[0];
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      
      const accessToken = await signAccessToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
      const refreshToken = await signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
      
      const cookieStore = await cookies();
      cookieStore.set("access_token", accessToken, { ...TOKEN_OPTS, maxAge: 15 * 60 });
      cookieStore.set("refresh_token", refreshToken, { ...TOKEN_OPTS, maxAge: 7 * 24 * 60 * 60 });
      
      return user;
    }),
    
  refresh: publicProcedure
    .mutation(async () => {
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get("refresh_token")?.value;
      if (!refreshToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No refresh token" });
      }
      
      const payload = await verifyToken<{ userId: string; tokenVersion: number }>(refreshToken);
      if (!payload?.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
      }
      
      const matched = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (matched.length === 0 || matched[0].tokenVersion !== payload.tokenVersion) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token revoked" });
      }
      
      const user = matched[0];
      const accessToken = await signAccessToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
      cookieStore.set("access_token", accessToken, { ...TOKEN_OPTS, maxAge: 15 * 60 });
      
      return { success: true };
    }),
    
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if email is being changed and is already in use
      if (ctx.user.email !== input.email) {
        const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
        }
      }

      await db.update(users)
        .set({
          name: input.name,
          email: input.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  logout: publicProcedure
    .mutation(async () => {
      const cookieStore = await cookies();
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      return { success: true };
    })
});
