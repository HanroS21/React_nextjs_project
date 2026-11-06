import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool, isDuplicateError } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Administrator access is required." }, { status: 403 });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, username, email, role, created_at, last_login_at FROM users ORDER BY id"
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Administrator access is required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const password = typeof body.password === "string" ? body.password : "";
  const role: Role = body.role === "admin" ? "admin" : "user";

  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) {
    return NextResponse.json(
      { message: "Username must be 3–50 characters: letters, numbers, dots, underscores or hyphens." },
      { status: 400 }
    );
  }
  if (password.length < 12 || password.length > 200) {
    return NextResponse.json({ message: "Password must be at least 12 characters." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Enter a valid email address or leave it blank." }, { status: 400 });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
      [username, email, await bcrypt.hash(password, 12), role, new Date()]
    );
    await audit(user, "CREATE", "user", result.insertId, { username, email, role });
    return NextResponse.json({ id: result.insertId, username, email, role }, { status: 201 });
  } catch (err) {
    if (isDuplicateError(err)) {
      return NextResponse.json({ message: "That username or email is already in use." }, { status: 409 });
    }
    throw err;
  }
}