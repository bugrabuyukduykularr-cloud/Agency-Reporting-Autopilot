import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/components";
import ReportDeliveryEmail from "@/emails/report-delivery";
import ReportFailedEmail from "@/emails/report-failed";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";
import type { DateRange } from "@/types/report-data";
import type { Agency, Client, Report } from "@/types/database";

// Lazy-init to avoid crashing at build time when RESEND_API_KEY is absent
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Send single report email ─────────────────────────────────────────────────

interface ReportWithRelations {
  report: Report;
  client: Client;
  agency: Agency;
}

export async function sendReportEmail(
  { report, client, agency }: ReportWithRelations,
  recipientEmail: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResend();

  const periodLabel = formatPeriodLabel({
    start: report.period_start,
    end: report.period_end,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const viewerUrl = `${appUrl}/r/${report.public_link}`;
  const pdfUrl = report.pdf_url ?? viewerUrl;
  const replyTo = agency.reply_to_email ?? process.env.EMAIL_FROM ?? "";

  const emailHtml = await render(
    ReportDeliveryEmail({
      clientName: client.name,
      periodLabel,
      agencyName: agency.name,
      agencyLogoUrl: agency.logo_url,
      agencyPrimaryColor: agency.primary_color,
      reportViewerUrl: viewerUrl,
      pdfDownloadUrl: pdfUrl,
      recipientEmail,
      replyToEmail: replyTo,
    })
  );

  const fromAddress = process.env.EMAIL_FROM ?? "reports@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: `${agency.name} <${fromAddress}>`,
      to: recipientEmail,
      replyTo: replyTo || undefined,
      subject: `Your ${periodLabel} Report is Ready`,
      html: emailHtml,
      tags: [
        { name: "report_id", value: report.id },
        { name: "client_id", value: report.client_id },
        { name: "agency_id", value: report.agency_id },
      ],
    });

    if (error) {
      console.error(`[email] Resend error for ${recipientEmail}:`, error.message);

      await supabase.from("email_deliveries").insert({
        report_id: report.id,
        agency_id: report.agency_id,
        recipient_email: recipientEmail,
        bounced: true,
        bounce_reason: error.message,
      });

      return { success: false, error: "Failed to send email" };
    }

    const messageId = data?.id ?? null;
    console.log(`[email] Sent to ${recipientEmail} — messageId: ${messageId}`);

    await supabase.from("email_deliveries").insert({
      report_id: report.id,
      agency_id: report.agency_id,
      recipient_email: recipientEmail,
      resend_message_id: messageId,
    });

    return { success: true, messageId: messageId ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown email error";
    console.error(`[email] Exception sending to ${recipientEmail}:`, msg);

    await supabase.from("email_deliveries").insert({
      report_id: report.id,
      agency_id: report.agency_id,
      recipient_email: recipientEmail,
      bounced: true,
      bounce_reason: msg,
    });

    return { success: false, error: "Failed to send email" };
  }
}

// ── Send to all recipients ───────────────────────────────────────────────────

interface SendAllResult {
  success: boolean;
  sentCount: number;
  failedEmails: string[];
}

export async function sendReportToAllRecipients(
  reportId: string,
  supabase: SupabaseClient
): Promise<SendAllResult> {
  // Fetch report + client + agency
  const { data: reportRow, error: reportErr } = await supabase
    .from("reports")
    .select(
      `*, clients(*, agencies(*))`
    )
    .eq("id", reportId)
    .single();

  if (reportErr || !reportRow) {
    console.error(`[email] Report ${reportId} not found`);
    return { success: false, sentCount: 0, failedEmails: [] };
  }

  interface ReportJoin {
    id: string;
    client_id: string;
    agency_id: string;
    period_start: string;
    period_end: string;
    status: string;
    pdf_url: string | null;
    public_link: string | null;
    ai_commentary: Record<string, unknown> | null;
    raw_data: Record<string, unknown> | null;
    sent_at: string | null;
    opened_at: string | null;
    created_at: string;
    clients: Client & { agencies: Agency };
  }

  const row = reportRow as unknown as ReportJoin;
  const client = row.clients;
  const agency = client.agencies;

  const report: Report = {
    id: row.id,
    client_id: row.client_id,
    agency_id: row.agency_id,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status as Report["status"],
    pdf_url: row.pdf_url,
    public_link: row.public_link,
    ai_commentary: row.ai_commentary,
    raw_data: row.raw_data,
    sent_at: row.sent_at,
    opened_at: row.opened_at,
    created_at: row.created_at,
  };

  const emails = client.contact_emails ?? [];
  if (emails.length === 0) {
    console.log(`[email] No contact emails for client ${client.name}`);
    return { success: true, sentCount: 0, failedEmails: [] };
  }

  let sentCount = 0;
  const failedEmails: string[] = [];

  // Send in sequence with delay
  for (const email of emails) {
    const result = await sendReportEmail({ report, client, agency }, email, supabase);
    if (result.success) {
      sentCount++;
    } else {
      failedEmails.push(email);
    }
    await sleep(200);
  }

  // Update report status to 'sent' if at least 1 email succeeded
  if (sentCount > 0) {
    await supabase
      .from("reports")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", reportId);
  }

  console.log(
    `[email] Report ${reportId}: ${sentCount} sent, ${failedEmails.length} failed`
  );
  return { success: sentCount > 0, sentCount, failedEmails };
}

// ── Failure notification to agency ───────────────────────────────────────────

export async function sendFailureNotification(
  client: Client,
  agency: Agency,
  period: DateRange,
  errorMessage: string
): Promise<void> {
  const resend = getResend();
  const periodLabel = formatPeriodLabel(period);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const clientSettingsUrl = `${appUrl}/clients/${client.id}`;

  const recipientEmail = agency.reply_to_email;
  if (!recipientEmail) {
    console.warn("[email] No reply_to_email for agency — skipping failure notification");
    return;
  }

  const emailHtml = await render(
    ReportFailedEmail({
      clientName: client.name,
      periodLabel,
      agencyName: agency.name,
      errorMessage,
      clientSettingsUrl,
    })
  );

  const fromAddress = process.env.EMAIL_FROM ?? "reports@resend.dev";

  try {
    await resend.emails.send({
      from: `${agency.name} <${fromAddress}>`,
      to: recipientEmail,
      subject: `Report Generation Failed for ${client.name}`,
      html: emailHtml,
    });
    console.log(`[email] Failure notification sent to ${recipientEmail}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[email] Failed to send failure notification: ${msg}`);
  }
}
