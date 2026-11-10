import type { PoolConnection } from "mysql2/promise";
import type { SessionUser } from "./types";

type Actor = Pick<SessionUser, "id" | "username" | "email"> | null;

// Takes the transaction's connection, so the log row commits or rolls back with the change.
// The built-in admin has id 0, which isn't a database row, so it's logged with no user id.
export async function audit(
  conn: PoolConnection,
  actor: Actor,
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: string,
  entityId: number | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  await conn.query(
    `INSERT INTO audit_log (at, user_id, user_email, action, entity, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date(),
      actor && actor.id > 0 ? actor.id : null,
      actor?.email || actor?.username || "system",
      action,
      entity,
      entityId,
      JSON.stringify(details),
    ]
  );
}