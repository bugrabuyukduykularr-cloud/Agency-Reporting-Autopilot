import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { fetchAllPlatformData } from "@/lib/data-fetchers/orchestrator";
import { generateReportCommentary } from "@/lib/ai/commentary-generator";
import {
  getCurrentPeriod,
  getPreviousPeriod,
  formatPeriodLabel,
} from "@/lib/utils/date-ranges";
import type { DateRange, UnifiedReportData } from "@/types/report-data";
import type { CommentaryRequest, ReportCommentary } from "@/types/ai-commentary";
import type { AITone } from "@/types/ai-commentary";

/**
 * POST /api/reports/generate
 *
 * Master orchestration route. Runs the full pipeline:
 *   1. Create report record (status: generating)
 *   2. Fetch platform data
 *   3. Generate AI commentary
 *   4. Generate PDF via internal call to /api/reports/generate-pdf
 *   5. Update report status to ready
 */
export async function POST(request: Request) {
  const supabase = createClient();

  // ── Auth ─────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: { clientId: string; periodStart?: string; periodEnd?: string };
  try {
    body = (await request.json()) as {
      clientId: string;
      periodStart?: string;
      periodEnd?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { clientId, periodStart, periodEnd } = body;
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  // ── Verify membership ────────────────────────────────────────────────────
  const { data: client } = await supabase
    .from("clients")
    .select("id, agency_id, name, ai_tone")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const agencyId = client.agency_id as string;
  const clientName = client.name as string;
  const aiTone = (client.ai_tone as AITone) ?? "professional";

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Date ranges ──────────────────────────────────────────────────────────
  const dateRange: DateRange =
    periodStart && periodEnd
      ? { start: periodStart, end: periodEnd }
      : getCurrentPeriod("monthly");

  const previousRange = getPreviousPeriod(dateRange);
  const periodLabel = formatPeriodLabel(dateRange);

  // ── Service-role client (used for internal steps) ─────────────────────────
  const serviceSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // ── STEP 0: Create report record ─────────────────────────────────────────
  const { data: reportRow, error: insertErr } = await serviceSupabase
    .from("reports")
    .insert({
      client_id: clientId,
      agency_id: agencyId,
      period_start: dateRange.start,
      period_end: dateRange.end,
      status: "generating",
    })
    .select("id, public_link")
    .single();

  if (insertErr || !reportRow) {
    return NextResponse.json(
      { error: "Failed to create report record" },
      { status: 500 }
    );
  }

  const reportId = reportRow.id as string;

  async function failReport(reason: string) {
    await serviceSupabase
      .from("reports")
      .update({ status: "failed" })
      .eq("id", reportId);
    console.error(`[generate] Report ${reportId} failed: ${reason}`);
  }

  // ── STEP A: Fetch platform data ───────────────────────────────────────────
  let reportData: UnifiedReportData;
  try {
    reportData = await fetchAllPlatformData(
      serviceSupabase,
      clientId,
      agencyId,
      dateRange,
      previousRange
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Data fetch failed";
    await failReport(msg);
    return NextResponse.json(
      { success: false, error: msg, reportId },
      { status: 500 }
    );
  }

  // If every platform failed, abort
  if (
    !reportData.ga4 &&
    !reportData.metaAds &&
    !reportData.linkedInAds &&
    reportData.fetchErrors.length > 0
  ) {
    await failReport("All platforms failed to fetch data");
    return NextResponse.json(
      {
        success: false,
        error: "All platforms failed. Check your data connections.",
        reportId,
        fetchErrors: reportData.fetchErrors,
      },
      { status: 422 }
    );
  }

  // Persist raw_data
  await serviceSupabase
    .from("reports")
    .update({ raw_data: reportData as unknown as Record<string, unknown> })
    .eq("id", reportId);

  // ── STEP B: Generate AI commentary ────────────────────────────────────────
  let commentary: ReportCommentary;
  try {
    const commentaryRequest: CommentaryRequest = {
      clientName,
      periodLabel,
      tone: aiTone,
      ga4Data: reportData.ga4,
      metaAdsData: reportData.metaAds,
      linkedInAdsData: reportData.linkedInAds,
    };
    commentary = await generateReportCommentary(commentaryRequest);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Commentary generation failed";
    await failReport(msg);
    return NextResponse.json(
      { success: false, error: msg, reportId },
      { status: 500 }
    );
  }

  // Persist commentary
  await serviceSupabase
    .from("reports")
    .update({
      ai_commentary: commentary as unknown as Record<string, unknown>,
    })
    .eq("id", reportId);

  // ── STEP C: Generate PDF ──────────────────────────────────────────────────
  let pdfUrl: string;
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const pdfResp = await fetch(`${baseUrl}/api/reports/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ reportId }),
    });

    if (!pdfResp.ok) {
      const errJson = (await pdfResp.json()) as { error?: string };
      throw new Error(errJson.error ?? "PDF generation failed");
    }

    const pdfJson = (await pdfResp.json()) as { pdfUrl: string };
    pdfUrl = pdfJson.pdfUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF generation failed";
    await failReport(msg);
    return NextResponse.json(
      { success: false, error: msg, reportId },
      { status: 500 }
    );
  }

  // ── STEP D: Update next_report_at ─────────────────────────────────────────
  try {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDate.setDate(1);
    await serviceSupabase
      .from("clients")
      .update({ next_report_at: nextDate.toISOString() })
      .eq("id", clientId);
  } catch {
    // Non-fatal — report is already ready
  }

  // ── Determine platforms included ──────────────────────────────────────────
  const platformsIncluded: string[] = [];
  if (reportData.ga4) platformsIncluded.push("ga4");
  if (reportData.metaAds) platformsIncluded.push("meta");
  if (reportData.linkedInAds) platformsIncluded.push("linkedin");

  console.log(
    `[generate] Report ${reportId} ready — platforms: ${platformsIncluded.join(", ")}, tokens: ${commentary.tokensUsed}`
  );

  return NextResponse.json({
    success: true,
    reportId,
    pdfUrl,
    platformsIncluded,
    tokensUsed: commentary.tokensUsed,
    executiveSummaryHeadline: commentary.executiveSummary.headline,
  });
}
