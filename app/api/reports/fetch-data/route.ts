import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { fetchAllPlatformData } from "@/lib/data-fetchers/orchestrator";
import type { DateRange } from "@/types/report-data";

interface FetchDataBody {
  clientId: string;
  agencyId: string;
  reportId: string;
  dateRange: DateRange;
  previousRange: DateRange;
}

/**
 * POST /api/reports/fetch-data
 *
 * Internal endpoint called by background jobs / cron. Authenticated with
 * service-role key passed in the X-Service-Key header — NOT the browser
 * session cookie.
 *
 * Body: { clientId, agencyId, reportId, dateRange, previousRange }
 * Returns: { success: true, platforms: string[], fetchErrors: ... }
 */
export async function POST(request: Request) {
  // ── Service-role auth ────────────────────────────────────────────────────
  const serviceKey = request.headers.get("X-Service-Key");
  if (!serviceKey || serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: FetchDataBody;
  try {
    body = (await request.json()) as FetchDataBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId, agencyId, reportId, dateRange, previousRange } = body;

  if (!clientId || !agencyId || !reportId || !dateRange || !previousRange) {
    return NextResponse.json(
      { error: "Missing required fields: clientId, agencyId, reportId, dateRange, previousRange" },
      { status: 400 }
    );
  }

  // ── Create service-role Supabase client (bypasses RLS) ──────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // ── Fetch all platform data ──────────────────────────────────────────────
  const unifiedData = await fetchAllPlatformData(
    supabase,
    clientId,
    agencyId,
    dateRange,
    previousRange
  );

  // ── Determine which platforms succeeded ──────────────────────────────────
  const platforms: string[] = [];
  if (unifiedData.ga4) platforms.push("ga4");
  if (unifiedData.metaAds) platforms.push("meta");
  if (unifiedData.linkedInAds) platforms.push("linkedin");

  // ── Persist raw_data into the reports table ──────────────────────────────
  const { error: updateError } = await supabase
    .from("reports")
    .update({
      raw_data: unifiedData,
      status: "data_ready",
      fetched_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("[fetch-data] Failed to update report:", updateError.message);
    return NextResponse.json(
      { error: "Failed to save fetched data", detail: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    platforms,
    fetchErrors: unifiedData.fetchErrors,
  });
}
