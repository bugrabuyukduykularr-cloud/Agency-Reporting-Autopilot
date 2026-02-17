import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPlatformData } from "@/lib/data-fetchers/orchestrator";
import {
  getCurrentPeriod,
  getPreviousPeriod,
} from "@/lib/utils/date-ranges";

/**
 * GET /api/reports/preview-data?clientId=...
 *
 * Frontend-accessible endpoint. Requires a valid browser session (agency
 * member). Returns a fresh UnifiedReportData preview for the last completed
 * period — useful for the report preview page before the PDF is generated.
 *
 * Returns: { dateRange, previousRange, data: UnifiedReportData, generatedAt }
 */
export async function GET(request: Request) {
  const supabase = createClient();

  // ── Auth check ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse query params ───────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing required query param: clientId" },
      { status: 400 }
    );
  }

  // ── Verify the caller is a member of the agency that owns this client ────
  const { data: client } = await supabase
    .from("clients")
    .select("id, agency_id")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const agencyId = client.agency_id as string;

  const { data: member } = await supabase
    .from("agency_members")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Resolve date ranges ─────────────────────────────────────────────────
  // Default to last completed month. A future version could accept a
  // schedule query param to support weekly previews.
  const dateRange = getCurrentPeriod("monthly");
  const previousRange = getPreviousPeriod(dateRange);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const data = await fetchAllPlatformData(
    supabase,
    clientId,
    agencyId,
    dateRange,
    previousRange
  );

  return NextResponse.json({
    dateRange,
    previousRange,
    data,
    generatedAt: new Date().toISOString(),
  });
}
