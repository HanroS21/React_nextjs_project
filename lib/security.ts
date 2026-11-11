import crypto from "crypto";
import { pool } from "./db";
import { sendUnlockEmail } from "./mailer";

export const MAX_FAILED_LOGINS = 5; // wrong passwords before the account locks
export const MAX_CODE_GUESSES = 5; // wrong codes before the current code is cancelled
export const CODE_TTL_MINUTES = 10; // how long an emailed code works
export const RESEND_COOLDOWN_SECONDS = 120; // minimum wait between emailed codes

export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Codes are stored as an HMAC keyed with JWT_SECRET, so a copy of the database alone isn't enough.
function hashCode(userId: number, code: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET ?? "")
    .update(`${userId}:${code}`)
    .digest("hex");
}

export function codeMatches(storedHash: string, userId: number, code: string): boolean {
  const expected = Buffer.from(hashCode(userId, code));
  const stored = Buffer.from(storedHash);
  return expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
}

// Creates a fresh code, replaces any older one, and emails it.
// Returns false when the account has no email address.
export async function issueUnlockCode(
  userId: number,
  username: string,
  email: string | null
): Promise<boolean> {
  if (!email) return false;

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await pool.query("DELETE FROM unlock_codes WHERE user_id = ?", [userId]);
  await pool.query(
    "INSERT INTO unlock_codes (user_id, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [userId, hashCode(userId, code), expiresAt, new Date()]
  );
  await sendUnlockEmail(email, username, code, CODE_TTL_MINUTES);
  return true;
}