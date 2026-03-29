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

    // ── Workflow Center tables ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_templates (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        workflow_type TEXT NOT NULL,
        category TEXT,
        fields JSONB DEFAULT '[]'::jsonb,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_submissions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        template_id INTEGER REFERENCES workflow_templates(id),
        workflow_type TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        department_id INTEGER REFERENCES departments(id),
        department_name TEXT,
        owner_name TEXT,
        assigned_to TEXT,
        requester_name TEXT,
        priority TEXT DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'New',
        category TEXT,
        start_date TEXT,
        due_date TEXT,
        expiry_date TEXT,
        renewal_date TEXT,
        next_occurrence TEXT,
        recurrence_type TEXT,
        reminder_days INTEGER DEFAULT 7,
        vendor_name TEXT,
        issue_authority TEXT,
        license_type TEXT,
        holder_name TEXT,
        sla_target TEXT,
        custom_fields JSONB DEFAULT '{}'::jsonb,
        tags TEXT[] DEFAULT ARRAY[]::text[],
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_comments (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES workflow_submissions(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_activity (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES workflow_submissions(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        user_id INTEGER REFERENCES users(id),
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        field TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS workflow_submissions_company_idx ON workflow_submissions(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS workflow_submissions_type_idx ON workflow_submissions(workflow_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS workflow_submissions_status_idx ON workflow_submissions(status)`);
    console.log("[migrations] workflow_center tables ready");

  } catch (err) {
    console.error("[migrations] Error running migrations:", err);
  } finally {
    client.release();
  }
}
