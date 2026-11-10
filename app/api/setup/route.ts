import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool, ensureSchema } from "@/lib/db";
import { ApiError, errorResponse, validUsername, validPassword } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sessionResponse } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export async function GET() {
  try {
    await ensureSchema();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM users");
    return NextResponse.json({ needsSetup: Number(rows[0].total) === 0 });
  } catch (err) {
    return errorResponse(err);
  }
}

// Creates the first database admin. A named lock and a recount stop two browsers from both creating one.
async function createFirstAdmin(username: string, passwordHash: string): Promise<SessionUser> {
  const conn: PoolConnection = await pool.getConnection();
  try {
    const [lock] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK('mini_weather_setup', 10) AS got");
    if (Number(lock[0].got) !== 1) {
      throw new ApiError(503, "Setup is busy. Try again in a moment.");
    }

    await conn.beginTransaction();

    const [count] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM users");
    if (Number(count[0].total) > 0) {
      throw new ApiError(409, "Setup is already complete. Sign in instead.");
    }

    const [result] = await conn.query<ResultSetHeader>(
      "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'admin', ?)",
      [username, passwordHash, new Date()]
    );
    const user: SessionUser = { id: result.insertId, username, email: null, role: "admin" };
    await audit(conn, user, "CREATE", "user", user.id, { username, role: "admin", source: "first-run setup" });

    await conn.commit();
    return user;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.query("SELECT RELEASE_LOCK('mini_weather_setup')").catch(() => {});
    conn.release();
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!validUsername(username)) {
      throw new ApiError(400, "Username must be 3–50 characters: letters, numbers, dots, underscores or hyphens.");
    }
    if (!validPassword(password)) {
      throw new ApiError(400, "Password must be at least 12 characters.");
    }

    const user = await createFirstAdmin(username, await bcrypt.hash(password, 12));
    return sessionResponse(user, 0);
  } catch (err) {
    return errorResponse(err, "That username is already in use.");
  }
}