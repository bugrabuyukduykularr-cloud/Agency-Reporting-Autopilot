import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getClientsDueForReport,
  calculateNextReportDate,
} from "@/lib/scheduler/due-reports";
import { sendReportToAllRecipients, sendFailureNotification } from "@/lib/email/sender";
import { getCurrentPeriod } from "@/lib/utils/date-ranges";
import type { ReportSchedule } from "@/types/index";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET /api/cron/generate-reports
 *
 * Main cron job — called every 15 minutes by Vercel Cron.
 * Protected by CRON_SECRET in the Authorization header.
 */
export async function GET(request: Request) {
  // ── Verify cron secret ───────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  console.log(`[cron] Job started at ${startedAt}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const clients = await getClientsDueForReport(supabase);
    console.log(`[cron] Found ${clients.length} clients due for reports`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    for (const clientRow of clients) {
      processed++;
      const client = clientRow;
      const agency = clientRow.agencies;

      console.log(`[cron] Generating report for ${client.name} (${client.id})`);

      try {
        // Calculate date range based on schedule
        const schedule = client.report_schedule as ReportSchedule;
        const currentPeriod = getCurrentPeriod(
          schedule === "weekly" ? "weekly" : "monthly"
        );
        // Call the generate endpoint with service-role auth
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
          error?: string;
        };

        if (!genResp.ok || !genJson.success) {
          throw new Error(genJson.error ?? "Generation failed");
        }

        // Send email to all recipients
        if (genJson.reportId) {
          const emailResult = await sendReportToAllRecipients(
            genJson.reportId,
            supabase
          );
          console.log(
            `[cron] ✓ Report sent for ${client.name}: ${emailResult.sentCount} emails`
          );
        }

        succeeded++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[cron] ✗ Failed for ${client.name}: ${msg}`);

        // Send failure notification to agency
        try {
          const schedule = client.report_schedule as ReportSchedule;
          const currentPeriod = getCurrentPeriod(
            schedule === "weekly" ? "weekly" : "monthly"
          );
          await sendFailureNotification(client, agency, currentPeriod, msg);
        } catch {
          // Non-fatal — just log
          console.error(`[cron] Failed to send failure notification for ${client.name}`);
        }
      }

      // Update next_report_at regardless of success/failure
      try {
        const nextDate = calculateNextReportDate(client);
        if (nextDate) {
          await supabase
            .from("clients")
            .update({ next_report_at: nextDate.toISOString() })
            .eq("id", client.id);
        }
      } catch {
        console.error(`[cron] Failed to update next_report_at for ${client.name}`);
      }

      // Sleep 2s between clients
      if (processed < clients.length) {
        await sleep(2000);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cron job error";
    console.error(`[cron] Fatal error: ${msg}`);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        processed,
        succeeded,
        failed,
        completedAt: new Date().toISOString(),
      },
      { status: 200 } // Return 200 even on error to avoid Vercel marking cron as failed
    );
  }

  console.log(
    `[cron] Job completed. ${succeeded} reports sent, ${failed} failed.`
  );

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
    startedAt,
    completedAt: new Date().toISOString(),
  });
}
