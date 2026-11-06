import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SessionRow } from "@/lib/types";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Administrator access is required." }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ message: "You cannot delete your own account." }, { status: 400 });
  }

  const [rows] = await pool.query<SessionRow[]>(
    "SELECT id, username, email, role FROM users WHERE id = ?",
    [id]
  );
  const target = rows[0];
  if (!target) return NextResponse.json({ message: "User not found." }, { status: 404 });

  if (target.role === "admin") {
    const [admins] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"
    );
    if (Number(admins[0].total) <= 1) {
      return NextResponse.json({ message: "You cannot delete the last administrator." }, { status: 400 });
    }
  }

  await audit(user, "DELETE", "user", id, { username: target.username, role: target.role });
  await pool.query("DELETE FROM users WHERE id = ?", [id]); // saved cities are removed by ON DELETE CASCADE

  return NextResponse.json({ message: "User deleted." });
}