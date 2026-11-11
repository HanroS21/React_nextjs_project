import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

const DB_NAME = process.env.DB_NAME ?? "react_weather";
if (!/^\w+$/.test(DB_NAME)) {
  throw new Error("DB_NAME may only contain letters, numbers and underscores.");
}

const config = {
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z",
};

const globalForDb = globalThis as unknown as { mysqlPool?: Pool; schemaReady?: Promise<void> };

export const pool: Pool =
  globalForDb.mysqlPool ?? mysql.createPool({ ...config, database: DB_NAME });
if (process.env.NODE_ENV !== "production") globalForDb.mysqlPool = pool;

// Creates the database and tables if they are missing. Runs once per server process.
export function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = createSchema().catch((err) => {
      globalForDb.schemaReady = undefined; // try again on the next request
      throw err;
    });
  }
  return globalForDb.schemaReady;
}

async function createSchema(): Promise<void> {
  const server = await mysql.createConnection(config);
  try {
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
  } finally {
    await server.end();
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(254) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','user') NOT NULL DEFAULT 'user',
      session_version INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      last_login_at DATETIME(3) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_cities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      city VARCHAR(100) NOT NULL,
      note VARCHAR(200) NOT NULL DEFAULT '',
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY uq_user_city (user_id, city),
      CONSTRAINT fk_city_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      at DATETIME(3) NOT NULL,
      user_id INT NULL,
      user_email VARCHAR(254) NOT NULL,
      action VARCHAR(10) NOT NULL,
      entity VARCHAR(30) NOT NULL,
      entity_id INT NULL,
      details JSON NULL,
      KEY idx_audit_user (user_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS unlock_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code_hash CHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      wrong_guesses INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      KEY idx_unlock_user (user_id, id),
      CONSTRAINT fk_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Adds columns to databases created by earlier versions of the app.
  await addColumnIfMissing("users", "session_version", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "failed_logins", "INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "locked", "TINYINT(1) NOT NULL DEFAULT 0");
}

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (Number(rows[0].n) === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
  }
}

// Runs the work inside one transaction. If anything throws, every change is undone.
export async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}