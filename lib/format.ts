import type { AuditEntry } from "./types";

const text = (value: unknown) => (typeof value === "string" ? value : "");
const quote = (value: unknown) =>
  value === "" || value == null ? "(empty)" : `"${String(value)}"`;

// Turns one activity log row into a readable sentence.
export function describeAudit(entry: AuditEntry): string {
  const d = entry.details;

  if (entry.entity === "user") {
    if (d.change === "password") return "Changed their password";
    if (entry.action === "CREATE") {
      return `Created account ${text(d.username)}${d.role === "admin" ? " as administrator" : ""}`;
    }
    return `${entry.action} account ${text(d.username)}`;
  }

  const verbs: Record<string, string> = { CREATE: "Saved", UPDATE: "Edited", DELETE: "Deleted" };
  let sentence = `${verbs[entry.action] ?? entry.action} ${text(d.city) || "a city"}`;

  const changes = d.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (entry.action === "UPDATE" && changes) {
    const parts = Object.entries(changes).map(
      ([key, value]) => `${key} from ${quote(value.from)} to ${quote(value.to)}`
    );
    sentence += `: ${parts.join(", ")}`;
  } else if (entry.action === "CREATE" && d.note) {
    sentence += ` with note ${quote(d.note)}`;
  }
  return sentence;
}