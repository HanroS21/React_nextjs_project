import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { pool } from "./db";
import type { SessionRow, SessionUser } from "./types";

export const SESSION_COOKIE = "mw_session";
const SESSION_SECONDS = 8 * 60 * 60;
const ISSUER = "mini-weather";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set in .env.local and be at least 32 characters.");
  }
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({ uid: userId }, jwtSecret(), { expiresIn: SESSION_SECONDS, issuer: ISSUER });
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

// Returns the signed-in user, or null. The role is read from the database, not the token.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret(), { issuer: ISSUER }) as { uid: number };
    const [rows] = await pool.query<SessionRow[]>(
      "SELECT id, username, email, role FROM users WHERE id = ?",
      [payload.uid]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}