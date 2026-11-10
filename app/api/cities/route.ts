import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { pool, withTransaction } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { requireDbUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SavedCityRow } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireDbUser();
    const [rows] = await pool.query<SavedCityRow[]>(
      "SELECT id, city, note FROM saved_cities WHERE user_id = ? ORDER BY city",
      [user.id]
    );
    return NextResponse.json(rows);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = (await request.json().catch(() => ({}))) as { city?: unknown };
    const city = typeof body.city === "string" ? body.city.trim() : "";
    if (!city || city.length > 100) {
      throw new ApiError(400, "City must be between 1 and 100 characters.");
    }

    await withTransaction(async (conn) => {
      const now = new Date();
      const [result] = await conn.query<ResultSetHeader>(
        "INSERT INTO saved_cities (user_id, city, note, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
        [user.id, city, now, now]
      );
      await audit(conn, user, "CREATE", "saved_city", result.insertId, { city, note: "" });
    });

    return NextResponse.json({ message: "City saved." }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "That city is already saved.");
  }
}