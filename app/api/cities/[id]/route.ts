import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SavedCityRow } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Every lookup includes user_id, so people can only change their own cities.
async function findOwnedCity(id: number, userId: number): Promise<SavedCityRow | undefined> {
  const [rows] = await pool.query<SavedCityRow[]>(
    "SELECT id, city, note FROM saved_cities WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return rows[0];
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ message: "Invalid city ID." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { note?: unknown };
  const note = typeof body.note === "string" ? body.note.trim() : null;
  if (note === null || note.length > 200) {
    return NextResponse.json({ message: "Note must be 0–200 characters." }, { status: 400 });
  }

  const city = await findOwnedCity(id, user.id);
  if (!city) return NextResponse.json({ message: "Saved city not found." }, { status: 404 });

  await pool.query("UPDATE saved_cities SET note = ?, updated_at = ? WHERE id = ?", [note, new Date(), id]);
  await audit(user, "UPDATE", "saved_city", id, {
    city: city.city,
    changes: { note: { from: city.note, to: note } },
  });

  return NextResponse.json({ message: "Note updated." });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ message: "Invalid city ID." }, { status: 400 });

  const city = await findOwnedCity(id, user.id);
  if (!city) return NextResponse.json({ message: "Saved city not found." }, { status: 404 });

  await pool.query("DELETE FROM saved_cities WHERE id = ?", [id]);
  await audit(user, "DELETE", "saved_city", id, { city: city.city, note: city.note });

  return NextResponse.json({ message: "City deleted." });
}