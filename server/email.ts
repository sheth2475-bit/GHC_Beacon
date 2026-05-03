import { Resend } from "resend";

let connectionSettings: any;

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not available");

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((r) => r.json())
    .then((d) => d.items?.[0]);

  if (!connectionSettings?.settings?.api_key) {
    throw new Error("Resend not connected");
  }

  // Send from verified domain; ignore the configured from_email if it's a free provider
  const rawFrom: string = connectionSettings.settings.from_email || "";
  const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const isFreeProvider = freeProviders.some(p => rawFrom.toLowerCase().includes(p));
  // onboarding@resend.dev is Resend's shared test sender — no domain verification needed.
  // Replace with a verified domain address (e.g. noreply@yourdomain.com) for production.
  const fromEmail = (!rawFrom || isFreeProvider)
    ? "Performo AI <onboarding@resend.dev>"
    : rawFrom;

  return { apiKey: connectionSettings.settings.api_key, fromEmail };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getResendCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

export interface DueReminderPayload {
  to: string[];
  itemType: "Initiative" | "Project";
  itemTitle: string;
  ownerName: string;
  dueDate: string;
  daysUntilDue: number;
  companyName: string;
}

export async function sendDueReminderEmail(payload: DueReminderPayload): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();

  function fmtDate(d: string): string {
    const [y, m, day] = d.split("-");
    return `${day}-${m}-${y}`;
  }

  const urgencyColor = payload.daysUntilDue <= 1 ? "#dc2626" : payload.daysUntilDue <= 3 ? "#d97706" : "#2563eb";
  const urgencyLabel = payload.daysUntilDue === 1 ? "Tomorrow" : `${payload.daysUntilDue} days`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:#bfdbfe;letter-spacing:0.08em;text-transform:uppercase;">Performo AI · Automated Reminder</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Upcoming Due Date</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#374151;">
        This is an automated reminder from <strong>Performo AI</strong> for <strong>${payload.companyName}</strong>.
        The following ${payload.itemType.toLowerCase()} is due in <strong style="color:${urgencyColor};">${urgencyLabel}</strong>.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;border-left:4px solid ${urgencyColor};">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="background:${urgencyColor}1a;color:${urgencyColor};padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;">${payload.itemType}</span>
        </div>
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">${payload.itemTitle}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:5px 0;color:#6b7280;width:130px;">Owner</td>
            <td style="padding:5px 0;color:#111827;font-weight:500;">${payload.ownerName}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Due Date</td>
            <td style="padding:5px 0;color:${urgencyColor};font-weight:700;">${fmtDate(payload.dueDate)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Time Remaining</td>
            <td style="padding:5px 0;color:${urgencyColor};font-weight:700;">${urgencyLabel}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;">
        Please log in to <strong>Performo AI</strong> to review progress and ensure this ${payload.itemType.toLowerCase()} is on track for completion.<br/>
        This is an automated reminder sent daily at 08:00 UTC.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Performo AI &mdash; Performance Management Platform &bull; Confidential — For internal use only
      </p>
    </div>
  </div>
</body>
</html>`;

  const subject = `⏰ Due in ${urgencyLabel}: ${payload.itemTitle}`;

  const result = await client.emails.send({
    from: fromEmail,
    to: payload.to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email");
  }
}

export interface ReminderPayload {
  to: string[];
  ownerName: string;
  actionTitle: string;
  actionDescription: string | null;
  dueDate: string | null;
  revisedDueDate: string | null;
  priority: string | null;
  status: string | null;
  completion: number | null;
  companyName: string;
  senderName: string;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

function priorityColor(p: string | null) {
  if (p === "Critical") return "#dc2626";
  if (p === "High") return "#ea580c";
  if (p === "Medium") return "#d97706";
  return "#6b7280";
}

// ── Workflow Automation Email ─────────────────────────────────────────────────
export interface WorkflowAutomationEmailPayload {
  to: string[];
  recipientName: string;
  subject: string;
  triggerLabel: string;
  actionLabel: string;
  recordTitle: string;
  referenceNumber: string;
  workflowTypeLabel: string;
  status: string;
  priority: string;
  dueDate?: string;
  expiryDate?: string;
  assignedTo?: string;
  ownerName?: string;
  companyName: string;
}

export async function sendWorkflowAutomationEmail(payload: WorkflowAutomationEmailPayload): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();

  const urgencyColor =
    payload.priority === "Critical" ? "#dc2626" :
    payload.priority === "High" ? "#ea580c" :
    "#2563eb";

  const rows = [
    payload.referenceNumber && `<tr><td style="padding:5px 0;color:#6b7280;width:140px;">Reference</td><td style="padding:5px 0;color:#111827;font-weight:500;font-family:monospace;">${payload.referenceNumber}</td></tr>`,
    `<tr><td style="padding:5px 0;color:#6b7280;">Type</td><td style="padding:5px 0;color:#111827;font-weight:500;">${payload.workflowTypeLabel}</td></tr>`,
    `<tr><td style="padding:5px 0;color:#6b7280;">Status</td><td style="padding:5px 0;color:#111827;font-weight:500;">${payload.status}</td></tr>`,
    `<tr><td style="padding:5px 0;color:#6b7280;">Priority</td><td style="padding:5px 0;"><span style="background:${urgencyColor}1a;color:${urgencyColor};padding:2px 8px;border-radius:4px;font-weight:600;font-size:12px;">${payload.priority}</span></td></tr>`,
    payload.assignedTo && `<tr><td style="padding:5px 0;color:#6b7280;">Assigned To</td><td style="padding:5px 0;color:#111827;font-weight:500;">${payload.assignedTo}</td></tr>`,
    payload.ownerName && `<tr><td style="padding:5px 0;color:#6b7280;">Owner</td><td style="padding:5px 0;color:#111827;font-weight:500;">${payload.ownerName}</td></tr>`,
    payload.dueDate && `<tr><td style="padding:5px 0;color:#6b7280;">Due Date</td><td style="padding:5px 0;color:${urgencyColor};font-weight:700;">${formatDate(payload.dueDate)}</td></tr>`,
    payload.expiryDate && `<tr><td style="padding:5px 0;color:#6b7280;">Expiry Date</td><td style="padding:5px 0;color:${urgencyColor};font-weight:700;">${formatDate(payload.expiryDate)}</td></tr>`,
  ].filter(Boolean).join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:#bfdbfe;letter-spacing:0.08em;text-transform:uppercase;">Performo AI · Workflow Center Automation</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${payload.subject}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        Hi <strong>${payload.recipientName || "Team"}</strong>,<br/><br/>
        An automated workflow rule has triggered for <strong>${payload.companyName}</strong>.
      </p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:10px;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Rule Triggered</p>
        <p style="margin:0;font-size:14px;color:#78350f;font-weight:600;">When: ${payload.triggerLabel}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#92400e;">Then: ${payload.actionLabel}</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;border-left:4px solid ${urgencyColor};">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">${payload.recordTitle}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;">
        Please log in to <strong>Performo AI</strong> to review and action this item.<br/>
        This is an automated message from the Workflow Center.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Performo AI &mdash; Workflow Center &bull; Confidential — For internal use only
      </p>
    </div>
  </div>
</body>
</html>`;

  const testEmail = process.env.RESEND_TEST_EMAIL;
  const effectiveTo = testEmail ? [testEmail] : payload.to.filter(Boolean);
  if (!effectiveTo.length) return;

  const result = await client.emails.send({ from: fromEmail, to: effectiveTo, subject: payload.subject, html });
  if (result.error) throw new Error(result.error.message || "Failed to send workflow automation email");
}

export async function sendActionReminder(payload: ReminderPayload): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();

  const effectiveDue = payload.revisedDueDate || payload.dueDate;
  const isOverdue =
    effectiveDue &&
    effectiveDue < new Date().toISOString().split("T")[0] &&
    payload.status !== "Completed" &&
    payload.status !== "Cancelled";

  const dueDateDisplay = payload.revisedDueDate
    ? `${formatDate(payload.dueDate)} <span style="color:#d97706;font-weight:600">→ Revised: ${formatDate(payload.revisedDueDate)}</span>`
    : formatDate(payload.dueDate);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:#bfdbfe;letter-spacing:0.08em;text-transform:uppercase;">Performo AI</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Action Item Reminder</h1>
    </div>
    
    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#374151;">
        Hi <strong>${payload.ownerName}</strong>,<br/><br/>
        This is a reminder from <strong>${payload.senderName}</strong> at <strong>${payload.companyName}</strong> regarding the following action item assigned to you.
        ${isOverdue ? '<br/><br/><span style="color:#dc2626;font-weight:600;">⚠ This action is overdue. Please update your progress or contact your manager.</span>' : ""}
      </p>
      
      <!-- Action Card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">${payload.actionTitle}</h2>
        ${payload.actionDescription ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">${payload.actionDescription}</p>` : ""}
        
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;width:130px;">Due Date</td>
            <td style="padding:6px 0;color:#111827;font-weight:500;">${dueDateDisplay}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Priority</td>
            <td style="padding:6px 0;">
              <span style="background:${priorityColor(payload.priority)}1a;color:${priorityColor(payload.priority)};padding:2px 8px;border-radius:4px;font-weight:600;font-size:12px;">${payload.priority || "Medium"}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Status</td>
            <td style="padding:6px 0;color:#111827;font-weight:500;">${payload.status || "Not Started"}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Completion</td>
            <td style="padding:6px 0;">
              <div style="background:#e5e7eb;border-radius:4px;height:8px;width:160px;overflow:hidden;display:inline-block;vertical-align:middle;margin-right:8px;">
                <div style="background:${(payload.completion ?? 0) === 100 ? "#10b981" : "#3b82f6"};height:100%;width:${payload.completion ?? 0}%;border-radius:4px;"></div>
              </div>
              <span style="font-weight:600;color:#111827;">${payload.completion ?? 0}%</span>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="margin:0;font-size:13px;color:#9ca3af;">
        Please log in to <strong>Performo AI</strong> to update your progress on this action item.<br/>
        This reminder was sent by ${payload.senderName} on ${formatDate(new Date().toISOString().split("T")[0])}.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Performo AI &mdash; Performance Management Platform &bull; Confidential — For internal use only
      </p>
    </div>
  </div>
</body>
</html>`;

  const subject = isOverdue
    ? `⚠ OVERDUE: ${payload.actionTitle}`
    : `Action Reminder: ${payload.actionTitle}`;

  // If RESEND_TEST_EMAIL is set, override all recipients for testing purposes.
  // This is required when using onboarding@resend.dev which only delivers to the Resend account owner.
  const testEmail = process.env.RESEND_TEST_EMAIL;
  const effectiveTo = testEmail ? [testEmail] : payload.to;

  const result = await client.emails.send({
    from: fromEmail,
    to: effectiveTo,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email");
  }
}

// ── KPI Alert Email ───────────────────────────────────────────────────────────
export interface KpiAlertEmailPayload {
  to: string;
  alertName: string;
  kpiName: string;
  deptName: string;
  periodKey: string;
  message: string;
  severity: "info" | "warning" | "critical";
  achPct: number | null;
  companyName: string;
}

export async function sendKpiAlertEmail(payload: KpiAlertEmailPayload): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();
  const severityColor = payload.severity === "critical" ? "#dc2626" : payload.severity === "warning" ? "#d97706" : "#2563eb";
  const severityLabel = payload.severity === "critical" ? "Critical" : payload.severity === "warning" ? "Warning" : "Info";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,${severityColor},${severityColor}cc);padding:24px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.8);letter-spacing:.08em;text-transform:uppercase;">GHC Beacon · KPI Alert</p>
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">${payload.alertName}</h1>
    </div>
    <div style="padding:28px 32px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;margin-bottom:20px;border-left:4px solid ${severityColor};">
        <span style="background:${severityColor}1a;color:${severityColor};padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;">${severityLabel}</span>
        <p style="margin:10px 0 0;font-size:15px;color:#111827;font-weight:500;">${payload.message}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <tr><td style="padding:5px 0;color:#6b7280;width:130px;">KPI</td><td style="padding:5px 0;color:#111827;font-weight:500;">${payload.kpiName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;">Department</td><td style="padding:5px 0;color:#111827;">${payload.deptName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;">Period</td><td style="padding:5px 0;color:#111827;">${payload.periodKey}</td></tr>
        ${payload.achPct !== null ? `<tr><td style="padding:5px 0;color:#6b7280;">Achievement</td><td style="padding:5px 0;color:${severityColor};font-weight:700;">${payload.achPct.toFixed(1)}%</td></tr>` : ""}
      </table>
      <p style="margin:0;font-size:12px;color:#9ca3af;">This alert was triggered automatically by <strong>GHC Beacon</strong> for <strong>${payload.companyName}</strong>. Log in to review.</p>
    </div>
  </div>
</body></html>`;
  const testEmail = process.env.RESEND_TEST_EMAIL;
  const res = await client.emails.send({
    from: fromEmail,
    to: testEmail ? [testEmail] : [payload.to],
    subject: `[${severityLabel}] KPI Alert: ${payload.kpiName} — ${payload.periodKey}`,
    html,
  });
  if (res.error) throw new Error(res.error.message || "Failed to send alert email");
}
