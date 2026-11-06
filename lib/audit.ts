import { pool } from "./db";
import type { SessionUser } from "./types";

type Actor = Pick<SessionUser, "id" | "username" | "email"> | null;

export async function audit(
  actor: Actor,
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: string,
  entityId: number | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (at, user_id, user_email, action, entity, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date(),
      actor?.id ?? null,
      actor?.email || actor?.username || "system",
      action,
      entity,
      entityId,
      JSON.stringify(details),
    ]
  );
}