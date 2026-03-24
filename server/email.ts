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
