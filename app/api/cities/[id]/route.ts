import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { requireDbUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SavedCityRow } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid city ID.");
  return id;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireDbUser();
    const id = parseId((await params).id);
    const body = (await request.json().catch(() => ({}))) as { note?: unknown };
    const note = typeof body.note === "string" ? body.note.trim() : null;
    if (note === null || note.length > 200) {
      throw new ApiError(400, "Note must be 0–200 characters.");
    }

    await withTransaction(async (conn) => {
      // FOR UPDATE locks the row, so two edits can't overwrite each other silently.
      const [rows] = await conn.query<SavedCityRow[]>(
        "SELECT id, city, note FROM saved_cities WHERE id = ? AND user_id = ? FOR UPDATE",
        [id, user.id]
      );
      const city = rows[0];
      if (!city) throw new ApiError(404, "Saved city not found.");

      await conn.query("UPDATE saved_cities SET note = ?, updated_at = ? WHERE id = ?", [note, new Date(), id]);
      await audit(conn, user, "UPDATE", "saved_city", id, {
        city: city.city,
        changes: { note: { from: city.note, to: note } },
      });
    });

    return NextResponse.json({ message: "Note updated." });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireDbUser();
    const id = parseId((await params).id);

    await withTransaction(async (conn) => {
      const [rows] = await conn.query<SavedCityRow[]>(
        "SELECT id, city, note FROM saved_cities WHERE id = ? AND user_id = ? FOR UPDATE",
        [id, user.id]
      );
      const city = rows[0];
      if (!city) throw new ApiError(404, "Saved city not found.");

      await conn.query("DELETE FROM saved_cities WHERE id = ?", [id]);
      await audit(conn, user, "DELETE", "saved_city", id, { city: city.city, note: city.note });
    });

    return NextResponse.json({ message: "City deleted." });
  } catch (err) {
    return errorResponse(err);
  }
}