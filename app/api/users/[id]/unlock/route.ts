import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { withTransaction } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser("admin");
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid user ID.");

    await withTransaction(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, username FROM users WHERE id = ? FOR UPDATE",
        [id]
      );
      const target = rows[0];
      if (!target) throw new ApiError(404, "User not found.");

      await conn.query("UPDATE users SET locked = 0, failed_logins = 0 WHERE id = ?", [id]);
      await conn.query("DELETE FROM unlock_codes WHERE user_id = ?", [id]);
      await audit(conn, admin, "UPDATE", "user", id, {
        event: "account_unlocked",
        method: "administrator",
        username: target.username,
      });
    });

    return NextResponse.json({ message: "Account unlocked." });
  } catch (err) {
    return errorResponse(err);
  }
}