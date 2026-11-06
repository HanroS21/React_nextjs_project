import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { pool, isDuplicateError } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SavedCityRow } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const [rows] = await pool.query<SavedCityRow[]>(
    "SELECT id, city, note FROM saved_cities WHERE user_id = ? ORDER BY city",
    [user.id]
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { city?: unknown };
  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (!city || city.length > 100) {
    return NextResponse.json({ message: "City must be between 1 and 100 characters." }, { status: 400 });
  }

  const now = new Date();
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO saved_cities (user_id, city, note, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
      [user.id, city, now, now]
    );
    await audit(user, "CREATE", "saved_city", result.insertId, { city, note: "" });
    return NextResponse.json({ message: "City saved." }, { status: 201 });
  } catch (err) {
    if (isDuplicateError(err)) {
      return NextResponse.json({ message: "That city is already saved." }, { status: 409 });
    }
    throw err;
  }
}