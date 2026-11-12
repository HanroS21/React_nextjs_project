import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { pool, ensureSchema, withTransaction } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api";
import { builtInAdmin, checkBuiltInPassword, sessionResponse } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MAX_FAILED_LOGINS } from "@/lib/security";
import type { LoginRow } from "@/lib/types";

type AccountRow = LoginRow & { locked: number };

const LOCKED_MESSAGE =
  "Your account is locked after too many failed sign-in attempts. Please contact your admin.";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) throw new ApiError(400, "Enter your username and password.");

    // 1. The built-in administrator from .env.local. It has no database row, so it isn't counted.
    const admin = builtInAdmin();
    if (admin && (await checkBuiltInPassword(username, password))) {
      return sessionResponse(admin, 0);
    }

    // 2. Database accounts.
    await ensureSchema();
    const [rows] = await pool.query<AccountRow[]>(
      `SELECT id, username, email, role, password_hash, session_version, locked
         FROM users WHERE username = ?`,
      [username]
    );
    const user = rows[0];

    // Unknown usernames get the same message as wrong passwords.
    if (!user) throw new ApiError(401, "Incorrect username or password.");

    // A locked account is refused even with the right password.
    if (user.locked === 1) throw new ApiError(423, LOCKED_MESSAGE);

    const matches = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!matches) {
      // "locked" is set from the count before this attempt is added.
      await pool.query(
        `UPDATE users
            SET locked = IF(failed_logins + 1 >= ?, 1, locked),
                failed_logins = failed_logins + 1
          WHERE id = ?`,
        [MAX_FAILED_LOGINS, user.id]
      );

      const [state] = await pool.query<RowDataPacket[]>("SELECT locked FROM users WHERE id = ?", [user.id]);
      if (Number(state[0].locked) === 1) {
        await announceLock(user);
        throw new ApiError(423, LOCKED_MESSAGE);
      }
      throw new ApiError(401, "Incorrect username or password.");
    }

    // Correct password: clear the failure count and record the sign-in.
    await pool.query("UPDATE users SET failed_logins = 0, last_login_at = ? WHERE id = ?", [new Date(), user.id]);

    return sessionResponse(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      user.session_version
    );
  } catch (err) {
    return errorResponse(err);
  }
}

// Records the lock in the activity log and prints a message for the developer.
async function announceLock(user: AccountRow): Promise<void> {
  await withTransaction((conn) =>
    audit(conn, { id: user.id, username: user.username, email: user.email }, "UPDATE", "user", user.id, {
      event: "account_locked",
    })
  );
  console.log(
    `[security] Account "${user.username}" is locked after too many failed sign-in attempts. Please contact your admin to unlock it.`
  );
}