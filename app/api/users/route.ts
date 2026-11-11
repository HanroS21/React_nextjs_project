import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool, withTransaction } from "@/lib/db";
import { ApiError, errorResponse, validEmail, validPassword, validUsername } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/types";

export async function GET() {
  try {
    await requireUser("admin");
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, email, role, created_at, last_login_at FROM users ORDER BY id"
    );
    return NextResponse.json(rows);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireUser("admin");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email =
      typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    const password = typeof body.password === "string" ? body.password : "";
    const role: Role = body.role === "admin" ? "admin" : "user";

    if (!validUsername(username)) {
      throw new ApiError(400, "Username must be 3–50 characters: letters, numbers, dots, underscores or hyphens.");
    }
    if (!validPassword(password)) throw new ApiError(400, "Password must be at least 12 characters.");
    if (email && !validEmail(email)) throw new ApiError(400, "Enter a valid email address or leave it blank.");

    const passwordHash = await bcrypt.hash(password, 12);

    const created = await withTransaction(async (conn) => {
      const [result] = await conn.query<ResultSetHeader>(
        "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
        [username, email, passwordHash, role, new Date()]
      );
      await audit(conn, admin, "CREATE", "user", result.insertId, { username, email, role });
      return { id: result.insertId, username, email, role };
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err, "That username or email is already in use.");
  }
}