import { pool } from "./db";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        user_name TEXT,
        user_role TEXT,
        plan_name TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        ip_address TEXT,
        user_agent TEXT,
        browser TEXT,
        os TEXT,
        device_type TEXT,
        login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS login_logs_user_id_idx ON login_logs(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS login_logs_company_id_idx ON login_logs(company_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS login_logs_login_at_idx ON login_logs(login_at DESC)
    `);

    console.log("[migrations] login_logs table ready");
  } catch (err) {
    console.error("[migrations] Error running migrations:", err);
  } finally {
    client.release();
  }
}
