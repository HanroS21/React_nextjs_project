import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import type { LoginRow } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ message: "Enter your username and password." }, { status: 400 });
  }

  const [rows] = await pool.query<LoginRow[]>(
    "SELECT id, username, email, role, password_hash FROM users WHERE username = ?",
    [username]
  );
  const user = rows[0];

  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ message: "Incorrect username or password." }, { status: 401 });
  }

  await pool.query("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date(), user.id]);

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE, signToken(user.id), sessionCookieOptions);
  return response;
}