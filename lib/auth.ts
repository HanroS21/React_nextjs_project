import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "./db";
import { ApiError } from "./api";
import { SESSION_COOKIE, sessionCookieOptions, readSession, signSession } from "./session";
import type { SessionRow, SessionUser } from "./types";

export { SESSION_COOKIE, sessionCookieOptions };

// The built-in administrator is defined in .env.local and has no database row.
// Id 0 is never used by a database row, so its session can't be confused with a real account.
export const BUILT_IN_ADMIN_ID = 0;

export function builtInAdmin(): SessionUser | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!username || !hash) return null;
  return { id: BUILT_IN_ADMIN_ID, username, email: null, role: "admin" };
}

// True only when the username matches and the password matches the stored bcrypt hash.
export async function checkBuiltInPassword(username: string, password: string): Promise<boolean> {
  const admin = builtInAdmin();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!admin || !hash || username !== admin.username) return false;
  return bcrypt.compare(password, hash);
}

// Returns the signed-in user, or null. Database accounts must match their current session version.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = readSession(token);
  if (!claims) return null;

  // The built-in administrator doesn't touch the database.
  if (claims.uid === BUILT_IN_ADMIN_ID) return builtInAdmin();

  await ensureSchema();
  const [rows] = await pool.query<SessionRow[]>(
    "SELECT id, username, email, role, session_version FROM users WHERE id = ?",
    [claims.uid]
  );
  const row = rows[0];
  if (!row || row.session_version !== claims.sv) return null;

  return { id: row.id, username: row.username, email: row.email, role: row.role };
}

// Use at the top of any route that needs a signed-in user. Throws ApiError if not allowed.
export async function requireUser(role?: "admin"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in is required.");
  if (role && user.role !== role) throw new ApiError(403, "Administrator access is required.");
  return user;
}

// For features that need a real database row, such as saved cities and password changes.
export async function requireDbUser(role?: "admin"): Promise<SessionUser> {
  const user = await requireUser(role);
  if (user.id === BUILT_IN_ADMIN_ID) {
    throw new ApiError(
      403,
      "The built-in administrator has no database account. Sign in with a database account to use this."
    );
  }
  return user;
}

// Builds the response that starts a session.
export function sessionResponse(user: SessionUser, sessionVersion: number): NextResponse {
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, signSession(user.id, sessionVersion), sessionCookieOptions);
  return response;
}