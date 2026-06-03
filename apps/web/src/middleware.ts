import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "default_super_secret_key_change_in_production";
const key = new TextEncoder().encode(secretKey);

const protectedRoutes = [
  "/customer", 
  "/floor", 
  "/kds", 
  "/order", 
  "/payment", 
  "/floor-plan", 
  "/payment-methods", 
  "/products", 
  "/reports", 
  "/sessions", 
  "/auth-redirect"
];
const publicRoutes = ["/login", "/signup", "/"];
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Basic route protection
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload?.userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    // Basic role routing
    if (payload.role === "customer" && !path.startsWith("/customer") && path !== "/auth-redirect") {
       return NextResponse.redirect(new URL("/customer", req.url));
    }

    // Admins and Cashiers going to /customer is allowed or we can redirect them to /floor
    // If they go to /, send them to /floor (or /products if admin)
    if (path === "/") {
      if (payload.role === "customer") return NextResponse.redirect(new URL("/customer", req.url));
      return NextResponse.redirect(new URL("/floor", req.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Token is invalid or expired (refresh token logic happens on the client or via a specialized route)
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
