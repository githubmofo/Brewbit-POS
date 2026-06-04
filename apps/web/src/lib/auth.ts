import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.");
}
const key = new TextEncoder().encode(secretKey);

export async function signAccessToken(payload: { userId: string; role: string; tokenVersion: number }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m") // Short-lived Access Token
    .sign(key);
}

export async function signRefreshToken(payload: { userId: string; tokenVersion: number }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Long-lived Refresh Token
    .sign(key);
}

export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as T;
  } catch (error) {
    return null;
  }
}
