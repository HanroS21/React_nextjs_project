import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { builtInAdmin, checkBuiltInPassword, sessionResponse } from "@/lib/auth";
import type { LoginRow } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      throw new ApiError(400, "Enter your username and password.");
    }

    // 1. The built-in administrator from .env.local. No database needed.
    const admin = builtInAdmin();
    if (admin && (await checkBuiltInPassword(username, password))) {
      return sessionResponse(admin, 0);
    }

    // 2. Database accounts.
    let user: LoginRow | undefined;
    try {
      await ensureSchema();
      const [rows] = await pool.query<LoginRow[]>(
        "SELECT id, username, email, role, password_hash, session_version FROM users WHERE username = ?",
        [username]
      );
      user = rows[0];
    } catch (err) {
      console.error("Database unavailable during sign-in:", err);
      throw new ApiError(
        503,
        admin
          ? "The database is unavailable. The built-in administrator can still sign in."
          : "The database is unavailable. Check that MySQL is running."
      );
    }

    const matches = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !matches) {
      throw new ApiError(401, "Incorrect username or password.");
    }

    await pool.query("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date(), user.id]);

    return sessionResponse(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      user.session_version
    );
  } catch (err) {
    return errorResponse(err);
  }
}