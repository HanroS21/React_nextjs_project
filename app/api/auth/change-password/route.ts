import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { withTransaction } from "@/lib/db";
import { ApiError, errorResponse, validPassword } from "@/lib/api";
import { requireDbUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!validPassword(newPassword)) {
      throw new ApiError(400, "New password must be at least 12 characters.");
    }
    const newHash = await bcrypt.hash(newPassword, 12);

    await withTransaction(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        "SELECT password_hash FROM users WHERE id = ? FOR UPDATE",
        [user.id]
      );
      const hash: string | undefined = rows[0]?.password_hash;
      if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
        throw new ApiError(400, "Current password is incorrect.");
      }

      // Raising session_version ends every session for this account, on every device.
      await conn.query(
        "UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
        [newHash, user.id]
      );
      await audit(conn, user, "UPDATE", "user", user.id, { change: "password" });
    });

    const response = NextResponse.json({ message: "Password changed. You have been signed out everywhere." });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch (err) {
    return errorResponse(err);
  }
}