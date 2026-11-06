import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 12 || newPassword.length > 200) {
    return NextResponse.json({ message: "New password must be at least 12 characters." }, { status: 400 });
  }

  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  const hash: string | null = rows[0]?.password_hash ?? null;

  if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
    return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 });
  }

  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    await bcrypt.hash(newPassword, 12),
    user.id,
  ]);
  await audit(user, "UPDATE", "user", user.id, { change: "password" });

  return NextResponse.json({ message: "Password changed." });
}