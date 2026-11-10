import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "mw_session";
export const SESSION_SECONDS = 8 * 60 * 60;
const ISSUER = "mini-weather";

export interface SessionClaims {
  uid: number;
  sv: number; // session version. A password change raises it, which ends every session.
}

function currentSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set in .env.local and be at least 32 characters.");
  }
  return secret;
}

function previousSecret(): string | null {
  const secret = process.env.JWT_SECRET_PREVIOUS;
  return secret && secret.length >= 32 ? secret : null;
}

export function signSession(uid: number, sv: number): string {
  return jwt.sign({ uid, sv }, currentSecret(), { expiresIn: SESSION_SECONDS, issuer: ISSUER });
}

// Returns the claims if the token is valid under either key, otherwise null.
export function readSession(token: string): SessionClaims | null {
  const keys = [currentSecret(), previousSecret()].filter((k): k is string => k !== null);
  for (const key of keys) {
    try {
      const payload = jwt.verify(token, key, { issuer: ISSUER }) as Partial<SessionClaims>;
      return typeof payload.uid === "number" && typeof payload.sv === "number"
        ? { uid: payload.uid, sv: payload.sv }
        : null;
    } catch {
      // Not signed with this key. Try the next one.
    }
  }
  return null;
}

// No maxAge: the browser deletes this cookie when it closes.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};