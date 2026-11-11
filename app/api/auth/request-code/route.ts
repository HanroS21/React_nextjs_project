import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool, ensureSchema } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { RESEND_COOLDOWN_SECONDS, issueUnlockCode } from "@/lib/security";

type UserRow = { id: number; username: string; email: string | null; locked: number } & RowDataPacket;

// The same reply is sent whether or not the account exists, so this can't be used to find usernames.
const GENERIC_MESSAGE = "If this account is locked and has an email address, a new code has been sent.";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json().catch(() => ({}))) as { username?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username) return NextResponse.json({ message: GENERIC_MESSAGE });

    const [users] = await pool.query<UserRow[]>(
      "SELECT id, username, email, locked FROM users WHERE username = ?",
      [username]
    );
    const user = users[0];
    if (!user || user.locked !== 1 || !user.email) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const [recent] = await pool.query<RowDataPacket[]>(
      "SELECT created_at FROM unlock_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [user.id]
    );
    const lastSent = recent[0] ? new Date(recent[0].created_at).getTime() : 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_SECONDS * 1000) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    try {
      await issueUnlockCode(user.id, user.username, user.email);
    } catch (err) {
      console.error("Could not send unlock code:", err);
    }
    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (err) {
    return errorResponse(err);
  }
}