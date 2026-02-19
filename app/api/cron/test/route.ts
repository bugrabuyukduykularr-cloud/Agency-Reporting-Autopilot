import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getClientsDueForReport,
  calculateNextReportDate,
} from "@/lib/scheduler/due-reports";
import { sendReportToAllRecipients } from "@/lib/email/sender";
import { getCurrentPeriod, getPreviousPeriod } from "@/lib/utils/date-ranges";
import type { ReportSchedule } from "@/types/index";

/**
 * GET /api/cron/test?secret={TEST_CRON_SECRET}
 *
 * Manual test endpoint — processes only 1 due client.
 * Protected by TEST_CRON_SECRET query param.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.TEST_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const steps: Array<{ step: string; result: string; timestamp: string }> = [];

  function log(step: string, result: string) {
    const entry = { step, result, timestamp: new Date().toISOString() };
    steps.push(entry);
    console.log(`[cron/test] ${step}: ${result}`);
  }

  // Step 1: Get due clients (limit 1)
  const clients = await getClientsDueForReport(supabase);
  log("Find due clients", `Found ${clients.length} total due clients`);

  if (clients.length === 0) {
    log("Result", "No clients due for reports. Set next_report_at to a past date to test.");
    return NextResponse.json({ success: true, steps });
  }

  const client = clients[0];
  log("Selected client", `${client.name} (${client.id})`);

  // Step 2: Generate report
  const schedule = client.report_schedule as ReportSchedule;
  const currentPeriod = getCurrentPeriod(
    schedule === "weekly" ? "weekly" : "monthly"
  );
  const previousPeriod = getPreviousPeriod(currentPeriod);
  log("Date range", `${currentPeriod.start} to ${currentPeriod.end} (prev: ${previousPeriod.start} to ${previousPeriod.end})`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let reportId: string | null = null;

  try {
    const genResp = await fetch(`${baseUrl}/api/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        clientId: client.id,
        periodStart: currentPeriod.start,
        periodEnd: currentPeriod.end,
      }),
    });

    const genJson = (await genResp.json()) as {
      success: boolean;
      reportId?: string;
      pdfUrl?: string;
      tokensUsed?: number;
      executiveSummaryHeadline?: string;
      error?: string;
    };

    if (!genResp.ok || !genJson.success) {
      log("Generate", `FAILED: ${genJson.error ?? "Unknown error"}`);
      return NextResponse.json({ success: false, steps });
    }

    reportId = genJson.reportId ?? null;
    log("Generate", `SUCCESS — reportId: ${reportId}`);
    log("PDF URL", genJson.pdfUrl ?? "N/A");
    log("AI Headline", genJson.executiveSummaryHeadline ?? "N/A");
    log("Tokens Used", String(genJson.tokensUsed ?? 0));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log("Generate", `EXCEPTION: ${msg}`);
    return NextResponse.json({ success: false, steps });
  }

  // Step 3: Send email
  if (reportId) {
    try {
      const emailResult = await sendReportToAllRecipients(reportId, supabase);
      log(
        "Email",
        `Sent: ${emailResult.sentCount}, Failed: ${emailResult.failedEmails.length}`
      );
      if (emailResult.failedEmails.length > 0) {
        log("Failed emails", emailResult.failedEmails.join(", "));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email error";
      log("Email", `EXCEPTION: ${msg}`);
    }
  }

  // Step 4: Update next_report_at
  const nextDate = calculateNextReportDate(client);
  if (nextDate) {
    await supabase
      .from("clients")
      .update({ next_report_at: nextDate.toISOString() })
      .eq("id", client.id);
    log("Next report", nextDate.toISOString());
  } else {
    log("Next report", "N/A (on_demand schedule)");
  }

  return NextResponse.json({ success: true, reportId, steps });
}
