import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? { connectionString, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      }
);

export async function initDb() {
  // Expect extension to exist (created by deploy scripts). Attempt to create table; log any failure.
  const sql =
    'CREATE TABLE IF NOT EXISTS users (' +
    'id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),' +
    'username VARCHAR(255) UNIQUE NOT NULL,' +
    'password_hash TEXT NOT NULL,' +
    'encrypted_vault TEXT' +
    ');';
  try {
    await pool.query(sql);
  } catch (err) {
    // Do not crash app start; log for diagnostics.
    console.error('DB init failed (ensure extension uuid-ossp exists):', err);
  }
}
