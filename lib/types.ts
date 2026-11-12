import type { RowDataPacket } from "mysql2";

export type Role = "admin" | "user";

export interface SessionUser {
  id: number;
  username: string;
  email: string | null;
  role: Role;
}

export type SessionRow = SessionUser & { session_version: number } & RowDataPacket;
export type LoginRow = SessionUser & { password_hash: string | null; session_version: number } & RowDataPacket;

export interface SavedCity {
  id: number;
  city: string;
  note: string;
}
export type SavedCityRow = SavedCity & RowDataPacket;

export interface AuditEntry {
  id: number;
  at: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: number | null;
  details: Record<string, unknown>;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  role: Role;
  locked: number;
  created_at: string;
  last_login_at: string | null;
}

export interface WeatherData {
  name: string;
  timezone?: number;
  visibility?: number;
  sys: { country: string; sunrise?: number; sunset?: number };
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  wind: { speed: number; deg?: number };
  clouds?: { all: number };
  weather: { main: string; description: string; icon: string }[];
}