import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { AuditEntry } from "@/lib/types";

const SELECT = "SELECT id, at, user_email, action, entity, entity_id, details FROM audit_log";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  // Admins see everyone's activity. Other users see only their own.
  const [rows] =
    user.role === "admin"
      ? await pool.query<RowDataPacket[]>(`${SELECT} ORDER BY id DESC LIMIT 200`)
      : await pool.query<RowDataPacket[]>(`${SELECT} WHERE user_id = ? ORDER BY id DESC LIMIT 200`, [user.id]);

  const entries: AuditEntry[] = rows.map((row) => ({
    id: row.id,
    at: new Date(row.at).toISOString(),
    user_email: row.user_email,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    details: typeof row.details === "string" ? JSON.parse(row.details) : (row.details ?? {}),
  }));

  return NextResponse.json(entries);
}