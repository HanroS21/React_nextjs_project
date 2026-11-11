import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool, ensureSchema, withTransaction } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { audit } from "@/lib/audit";
import { MAX_CODE_GUESSES, codeMatches } from "@/lib/security";

type LockedRow = { id: number; username: string; email: string | null; locked: number } & RowDataPacket;
type CodeRow = { id: number; code_hash: string; expires_at: Date; wrong_guesses: number } & RowDataPacket;

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json().catch(() => ({}))) as { username?: unknown; code?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!username || !/^\d{6}$/.test(code)) {
      throw new ApiError(400, "Enter the 6-digit code from your email.");
    }

    const [users] = await pool.query<LockedRow[]>(
      "SELECT id, username, email, locked FROM users WHERE username = ?",
      [username]
    );
    const user = users[0];
    if (!user || user.locked !== 1) throw new ApiError(400, "That code is not valid.");

    const [codes] = await pool.query<CodeRow[]>(
      `SELECT id, code_hash, expires_at, wrong_guesses
         FROM unlock_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    const current = codes[0];
    if (!current || new Date(current.expires_at).getTime() < Date.now()) {
      throw new ApiError(400, "That code has expired. Request a new one.");
    }
    if (current.wrong_guesses >= MAX_CODE_GUESSES) {
      throw new ApiError(400, "Too many wrong codes. Request a new one.");
    }

    if (!codeMatches(current.code_hash, user.id, code)) {
      await pool.query("UPDATE unlock_codes SET wrong_guesses = wrong_guesses + 1 WHERE id = ?", [current.id]);
      throw new ApiError(400, "That code is not valid.");
    }

    await withTransaction(async (conn) => {
      await conn.query("DELETE FROM unlock_codes WHERE user_id = ?", [user.id]);
      await conn.query("UPDATE users SET locked = 0, failed_logins = 0 WHERE id = ?", [user.id]);
      await audit(conn, { id: user.id, username: user.username, email: user.email }, "UPDATE", "user", user.id, {
        event: "account_unlocked",
        method: "email code",
      });
    });

    return NextResponse.json({ message: "Account unlocked. Sign in with your password." });
  } catch (err) {
    return errorResponse(err);
  }
}