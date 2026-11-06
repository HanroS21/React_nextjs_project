import mysql, { type Pool } from "mysql2/promise";

const globalForDb = globalThis as unknown as { mysqlPool?: Pool };

export const pool: Pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "mini_weather",
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalForDb.mysqlPool = pool;

export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ER_DUP_ENTRY";
}