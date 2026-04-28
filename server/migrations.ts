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

    // Add KPI milestone/frequency columns (idempotent)
    const kpiCols = [
      { col: "target_type",         type: "TEXT DEFAULT 'numeric'" },
      { col: "target_date",         type: "TEXT" },
      { col: "target_frequency",    type: "TEXT DEFAULT 'monthly'" },
      { col: "milestone_start_date",type: "TEXT" },
    ];
    for (const { col, type } of kpiCols) {
      await client.query(`ALTER TABLE kpis ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    await client.query(`ALTER TABLE kpi_actuals ADD COLUMN IF NOT EXISTS milestone_target TEXT`);

    // Add email columns (safe ALTER TABLE — idempotent)
    const emailCols = [
      { col: "owner_email", type: "TEXT" },
      { col: "assigned_to_email", type: "TEXT" },
      { col: "requester_email", type: "TEXT" },
      { col: "holder_email", type: "TEXT" },
    ];
    for (const { col, type } of emailCols) {
      await client.query(`ALTER TABLE workflow_submissions ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }

    console.log("[migrations] workflow_center tables ready");

    // ── Seed demo workflow data (only if none yet for company 1) ─────────
    const { rows: existing } = await client.query(`SELECT id FROM workflow_submissions WHERE company_id = 1 LIMIT 1`);
    if (existing.length === 0) {
      const now = new Date();
      const d = (offset: number) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + offset);
        return dt.toISOString().slice(0, 10);
      };

      type SeedRow = [
        number, number, string, string, string, string, string, string,
        string, string, string, string, string, string, string, string,
        string, string, string, string
      ];

      const seeds: SeedRow[] = [
        // recurring_task (4)
        [1, 1, "recurring_task", `RT-${Date.now()}-001`, "Monthly P&L Report", "Prepare and distribute monthly P&L statement to all HODs", "Operations", "Rania Al Mansouri", "rania@oyohotels.ae", "Dharmesh Sheth", "dharmesh@oyohotels.ae", "", "", "Monthly", d(5), "", "Scheduled", "High", "", ""],
        [1, 1, "recurring_task", `RT-${Date.now()}-002`, "Housekeeping Standards Audit", "Conduct weekly quality check across all guest floors", "Operations", "Faisal Hassan", "faisal@oyohotels.ae", "Noura Bin Rashid", "noura@oyohotels.ae", "", "", "Weekly", d(-2), "", "Overdue", "Medium", "", ""],
        [1, 1, "recurring_task", `RT-${Date.now()}-003`, "Employee Payroll Processing", "Process monthly payroll and distribute payslips", "HR", "Priya Sharma", "priya@oyohotels.ae", "Rania Al Mansouri", "rania@oyohotels.ae", "", "", "Monthly", d(12), "", "Scheduled", "Critical", "", ""],
        [1, 1, "recurring_task", `RT-${Date.now()}-004`, "Fire Safety Equipment Check", "Inspect all fire extinguishers and sprinkler systems", "Operations", "Khalid Mansoor", "khalid@oyohotels.ae", "Dharmesh Sheth", "dharmesh@oyohotels.ae", "", "", "Quarterly", d(-5), "", "Overdue", "High", "", ""],
        // service_ticket (5)
        [1, 1, "service_ticket", `TKT-${Date.now()}-001`, "Lobby AC Unit Not Cooling", "Main lobby air conditioning unit not functioning. Guests reporting discomfort.", "Operations", "Faisal Hassan", "faisal@oyohotels.ae", "Sara Ahmed", "sara@oyohotels.ae", "Omar Khalil", "omar@oyohotels.ae", "", d(1), "", "In Progress", "Critical", "", "4 hours"],
        [1, 1, "service_ticket", `TKT-${Date.now()}-002`, "POS System Downtime - Restaurant", "F&B POS system offline causing revenue loss at main restaurant.", "Finance", "Noura Bin Rashid", "noura@oyohotels.ae", "Michael Chen", "michael@oyohotels.ae", "Lisa Wong", "lisa@oyohotels.ae", "", d(0), "", "Escalated", "Critical", "", "2 hours"],
        [1, 1, "service_ticket", `TKT-${Date.now()}-003`, "Guest Room 412 Plumbing Issue", "Water leak reported in bathroom of room 412. Guest moved to 414.", "Operations", "Khalid Mansoor", "khalid@oyohotels.ae", "Faisal Hassan", "faisal@oyohotels.ae", "David Park", "david@oyohotels.ae", "", d(0), "", "Assigned", "High", "", "8 hours"],
        [1, 1, "service_ticket", `TKT-${Date.now()}-004`, "New Employee Onboarding Setup", "Provision laptop, email and system access for Fatima Al Rashid joining HR dept.", "HR", "Priya Sharma", "priya@oyohotels.ae", "Rania Al Mansouri", "rania@oyohotels.ae", "Fatima Al Rashid", "fatima@oyohotels.ae", "", d(3), "", "New", "Medium", "", "24 hours"],
        [1, 1, "service_ticket", `TKT-${Date.now()}-005`, "Marketing Collateral Print Request", "Print 500 copies of updated property brochure for GITEX travel expo.", "Sales", "Sarah Johnson", "sarah@oyohotels.ae", "Omar Khalil", "omar@oyohotels.ae", "Lisa Wong", "lisa@oyohotels.ae", "", d(7), "", "Pending", "Low", "", "48 hours"],
        // license (4)
        [1, 1, "license", `LIC-${Date.now()}-001`, "Dubai Tourism Operating License", "Official DTCM tourism operating license for OYO Hospitality UAE", "Operations", "Rania Al Mansouri", "rania@oyohotels.ae", "Dharmesh Sheth", "dharmesh@oyohotels.ae", "", "", "Trade", d(25), d(25), "Expiring Soon", "Critical", "DTCM", ""],
        [1, 1, "license", `LIC-${Date.now()}-002`, "Microsoft Office 365 Enterprise", "Enterprise M365 subscription — 150 seats across all properties", "Finance", "Noura Bin Rashid", "noura@oyohotels.ae", "Michael Chen", "michael@oyohotels.ae", "", "", "Software", d(90), d(90), "Active", "High", "Microsoft", ""],
        [1, 1, "license", `LIC-${Date.now()}-003`, "Food Handling & Safety License", "Municipal food handling permit for kitchen and F&B operations", "Operations", "Khalid Mansoor", "khalid@oyohotels.ae", "Faisal Hassan", "faisal@oyohotels.ae", "", "", "Health & Safety", d(-10), d(-10), "Expired", "Critical", "Dubai Municipality", ""],
        [1, 1, "license", `LIC-${Date.now()}-004`, "Property Management System (Opera)", "OPERA PMS annual software license for front desk operations", "Finance", "Rania Al Mansouri", "rania@oyohotels.ae", "Noura Bin Rashid", "noura@oyohotels.ae", "", "", "Software", d(180), d(180), "Active", "High", "Oracle Hospitality", ""],
        // certificate (5)
        [1, 1, "certificate", `CERT-${Date.now()}-001`, "ISO 9001 Quality Management Certification", "International quality management systems certification for hotel operations", "Operations", "Dharmesh Sheth", "dharmesh@oyohotels.ae", "Rania Al Mansouri", "rania@oyohotels.ae", "", "", "ISO", d(20), d(20), "Expiring Soon", "High", "", "Bureau Veritas"],
        [1, 1, "certificate", `CERT-${Date.now()}-002`, "Food Safety HACCP Certification", "HACCP food safety management certification for all F&B staff", "Operations", "Khalid Mansoor", "khalid@oyohotels.ae", "Faisal Hassan", "faisal@oyohotels.ae", "", "", "Health & Safety", d(60), d(60), "Active", "High", "", "SGS"],
        [1, 1, "certificate", `CERT-${Date.now()}-003`, "First Aid Training - Front Desk Team", "CPR and first aid certification for 12 front desk team members", "HR", "Priya Sharma", "priya@oyohotels.ae", "Sara Ahmed", "sara@oyohotels.ae", "", "", "Health & Safety", d(-15), d(-15), "Expired", "Medium", "", "Dubai Red Crescent"],
        [1, 1, "certificate", `CERT-${Date.now()}-004`, "Fire Warden Training Certificate", "Certified fire warden training for housekeeping supervisors", "Operations", "Faisal Hassan", "faisal@oyohotels.ae", "Khalid Mansoor", "khalid@oyohotels.ae", "", "", "Safety", d(120), d(120), "Active", "Medium", "", "Civil Defence UAE"],
        [1, 1, "certificate", `CERT-${Date.now()}-005`, "PCI DSS Payment Security Compliance", "Payment card industry data security standard compliance certificate", "Finance", "Noura Bin Rashid", "noura@oyohotels.ae", "Michael Chen", "michael@oyohotels.ae", "", "", "Compliance", d(14), d(14), "Expiring Soon", "Critical", "", "QSA Auditors Ltd"],
      ];

      for (const [
        companyId, createdBy, workflowType, referenceNumber, title, description,
        departmentName, assignedTo, assignedToEmail, ownerName, ownerEmail,
        requesterName, requesterEmail, recurrenceOrLicenseType, dueDate, expiryDate,
        status, priority, vendorName, issueAuthority,
      ] of seeds) {
        await client.query(`
          INSERT INTO workflow_submissions
            (company_id, created_by, workflow_type, reference_number, title, description,
             department_name, assigned_to, assigned_to_email, owner_name, owner_email,
             requester_name, requester_email, recurrence_type, license_type, due_date, expiry_date,
             status, priority, vendor_name, issue_authority)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15,$16,$17,$18,$19,$20)
        `, [
          companyId, createdBy, workflowType, referenceNumber, title, description,
          departmentName, assignedTo, assignedToEmail, ownerName, ownerEmail,
          requesterName, requesterEmail, recurrenceOrLicenseType, dueDate, expiryDate,
          status, priority, vendorName, issueAuthority,
        ]);
      }
      console.log("[migrations] seeded 18 demo workflow records");
    }

    // ── Presentation Studio tables ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS presentations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL DEFAULT 'Untitled Presentation',
        status TEXT NOT NULL DEFAULT 'draft',
        source_types JSONB DEFAULT '[]'::jsonb,
        brief JSONB DEFAULT '{}'::jsonb,
        outline JSONB DEFAULT '[]'::jsonb,
        slides JSONB DEFAULT '[]'::jsonb,
        theme TEXT DEFAULT 'executive-dark',
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS presentation_versions (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        outline JSONB DEFAULT '[]'::jsonb,
        slides JSONB DEFAULT '[]'::jsonb,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS presentations_company_id_idx ON presentations(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS presentations_created_by_idx ON presentations(created_by)`);
    console.log("[migrations] presentation_studio tables ready");

    // ── BSC legacy department cleanup ────────────────────────────────────────
    // Remove stale demo departments (ops/fin/hr/it) that existed in old versions.
    // For companies that have ANY legacy dept, wipe their entire BSC data so the
    // auto-seed can repopulate with the canonical [corp, eng] setup + actuals.
    const legacyCheck = await client.query(`
      SELECT DISTINCT company_id FROM bsc_departments
      WHERE dept_id IN ('ops', 'fin', 'hr', 'it')
    `);
    if (legacyCheck.rows.length > 0) {
      const legacyCompanyIds = legacyCheck.rows.map((r: any) => r.company_id);
      for (const cid of legacyCompanyIds) {
        await client.query(`DELETE FROM bsc_actuals WHERE company_id = $1`, [cid]);
        await client.query(`DELETE FROM bsc_departments WHERE company_id = $1`, [cid]);
        await client.query(`DELETE FROM scorecard_shares WHERE company_id = $1`, [cid]);
        console.log(`[migrations] Cleared legacy BSC data for company ${cid} — auto-seed will repopulate`);
      }
    }

    // ── One-time: clear auto-seeded BSC demo data from production companies ──
    // Before NODE_ENV guards were added, the GET /api/scorecard/departments and
    // GET /api/scorecard/actuals routes auto-populated every new company with demo
    // data. This migration removes those actuals from non-demo companies so they
    // start with a clean slate.
    await client.query(`
      CREATE TABLE IF NOT EXISTS bsc_demo_cleanup_v1 (
        id SERIAL PRIMARY KEY,
        done_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const cleanupDone = await client.query(`SELECT id FROM bsc_demo_cleanup_v1 LIMIT 1`);
    if (cleanupDone.rows.length === 0) {
      // Identify the demo company (owned by demo@performo.ai)
      const demoCompanyRes = await client.query(
        `SELECT company_id FROM users WHERE email = 'demo@performo.ai' LIMIT 1`
      );
      const demoCompanyId = demoCompanyRes.rows[0]?.company_id ?? -1;
      // Delete auto-seeded actuals for every other company
      const cleared = await client.query(
        `DELETE FROM bsc_actuals WHERE company_id != $1 RETURNING company_id`,
        [demoCompanyId]
      );
      if (cleared.rowCount && cleared.rowCount > 0) {
        console.log(`[migrations] Cleared ${cleared.rowCount} auto-seeded BSC actuals from non-demo companies`);
      }
      await client.query(`INSERT INTO bsc_demo_cleanup_v1 DEFAULT VALUES`);
    }

    // ── Add IT department to demo company if missing ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bsc_it_dept_seed_v1 (
        id SERIAL PRIMARY KEY,
        done_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const itSeedDone = await client.query(`SELECT id FROM bsc_it_dept_seed_v1 LIMIT 1`);
    if (itSeedDone.rows.length === 0) {
      const demoRes = await client.query(`SELECT company_id FROM users WHERE email = 'demo@performo.ai' LIMIT 1`);
      const demoCid = demoRes.rows[0]?.company_id;
      if (demoCid) {
        const existing = await client.query(`SELECT id FROM bsc_departments WHERE company_id = $1 AND dept_id = 'it' LIMIT 1`, [demoCid]);
        if (existing.rows.length === 0) {
          // Get current max sort_order
          const sortRes = await client.query(`SELECT COALESCE(MAX(sort_order),4) AS m FROM bsc_departments WHERE company_id = $1`, [demoCid]);
          const so = (sortRes.rows[0]?.m ?? 4) + 1;
          await client.query(
            `INSERT INTO bsc_departments (company_id, dept_id, name, icon, color, sort_order) VALUES ($1, 'it', 'IT', '💻', '#06B6D4', $2)`,
            [demoCid, so]
          );
          // Seed 7 months of IT actuals
          const itActuals: [string, string, number][] = [
            ["2025-10","it_i1",5],  ["2025-10","m_it_i1",10], ["2025-10","it_c1",82], ["2025-10","it_i2",78], ["2025-10","it_c2",88], ["2025-10","it_i3",55], ["2025-10","it_c3",2.8], ["2025-10","it_l1",65], ["2025-10","it_l2",1], ["2025-10","it_i4",6], ["2025-10","it_f1",108], ["2025-10","it_i5",3], ["2025-10","it_c4",4],
            ["2025-11","it_i1",18], ["2025-11","m_it_i1",20], ["2025-11","it_c1",84], ["2025-11","it_i2",81], ["2025-11","it_c2",90], ["2025-11","it_i3",52], ["2025-11","it_c3",3.0], ["2025-11","it_l1",70], ["2025-11","it_l2",2], ["2025-11","it_i4",8], ["2025-11","it_f1",105], ["2025-11","it_i5",5], ["2025-11","it_c4",3],
            ["2025-12","it_i1",30], ["2025-12","m_it_i1",30], ["2025-12","it_c1",85], ["2025-12","it_i2",84], ["2025-12","it_c2",92], ["2025-12","it_i3",50], ["2025-12","it_c3",3.0], ["2025-12","it_l1",75], ["2025-12","it_l2",3], ["2025-12","it_i4",9], ["2025-12","it_f1",103], ["2025-12","it_i5",7], ["2025-12","it_c4",2],
            ["2026-01","it_i1",45], ["2026-01","m_it_i1",45], ["2026-01","it_c1",86], ["2026-01","it_i2",86], ["2026-01","it_c2",93.5], ["2026-01","it_i3",48], ["2026-01","it_c3",3.2], ["2026-01","it_l1",80], ["2026-01","it_l2",3], ["2026-01","it_i4",10], ["2026-01","it_f1",101], ["2026-01","it_i5",8], ["2026-01","it_c4",1],
            ["2026-02","it_i1",58], ["2026-02","m_it_i1",58], ["2026-02","it_c1",87], ["2026-02","it_i2",88], ["2026-02","it_c2",94], ["2026-02","it_i3",52], ["2026-02","it_c3",3.3], ["2026-02","it_l1",85], ["2026-02","it_l2",4], ["2026-02","it_i4",11], ["2026-02","it_f1",100], ["2026-02","it_i5",9], ["2026-02","it_c4",1],
            ["2026-03","it_i1",72], ["2026-03","m_it_i1",70], ["2026-03","it_c1",88], ["2026-03","it_i2",90], ["2026-03","it_c2",95], ["2026-03","it_i3",54], ["2026-03","it_c3",3.2], ["2026-03","it_l1",88], ["2026-03","it_l2",4], ["2026-03","it_i4",11], ["2026-03","it_f1",99], ["2026-03","it_i5",10], ["2026-03","it_c4",0],
            ["2026-04","it_i1",84], ["2026-04","m_it_i1",80], ["2026-04","it_c1",90], ["2026-04","it_i2",92], ["2026-04","it_c2",96], ["2026-04","it_i3",55], ["2026-04","it_c3",3.5], ["2026-04","it_l1",92], ["2026-04","it_l2",5], ["2026-04","it_i4",13], ["2026-04","it_f1",98], ["2026-04","it_i5",12], ["2026-04","it_c4",0],
          ];
          for (const [pk, kpiId, val] of itActuals) {
            await client.query(
              `INSERT INTO bsc_actuals (company_id, dept_id, period_key, kpi_id, actual_value) VALUES ($1, 'it', $2, $3, $4) ON CONFLICT DO NOTHING`,
              [demoCid, pk, kpiId, val]
            );
          }
          console.log(`[migrations] Added IT department and 7 months of actuals to demo company`);
        }
      }
      await client.query(`INSERT INTO bsc_it_dept_seed_v1 DEFAULT VALUES`);
    }

    // ── Orphan user cleanup ───────────────────────────────────────────────────
    // Delete users with no company_id that are not part of the demo accounts.
    // Demo accounts: demo@performo.ai, exec@performo.ai, member@performo.ai
    const demoEmails = ['demo@performo.ai', 'exec@performo.ai', 'member@performo.ai'];
    const placeholders = demoEmails.map((_, i) => `$${i + 1}`).join(', ');
    const orphanResult = await client.query(
      `DELETE FROM users WHERE company_id IS NULL AND email NOT IN (${placeholders}) RETURNING email`,
      demoEmails
    );
    if (orphanResult.rows.length > 0) {
      console.log(`[migrations] Deleted ${orphanResult.rows.length} orphan user(s): ${orphanResult.rows.map((r: any) => r.email).join(', ')}`);
    }

  } catch (err) {
    console.error("[migrations] Error running migrations:", err);
  } finally {
    client.release();
  }
}
