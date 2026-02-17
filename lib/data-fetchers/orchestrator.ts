import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGA4Data } from "./google-analytics";
import { fetchMetaAdsData } from "./meta-ads";
import { fetchLinkedInAdsData } from "./linkedin-ads";
import { generateMockUnifiedData } from "./mock-data";
import type {
  DateRange,
  UnifiedReportData,
  GA4Data,
  MetaAdsData,
  LinkedInAdsData,
  FetchResult,
} from "@/types/report-data";

interface DataConnection {
  id: string;
  platform: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------
export async function fetchAllPlatformData(
  supabase: SupabaseClient,
  clientId: string,
  agencyId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<UnifiedReportData> {
  // USE_MOCK_DATA shortcircuit — allows full testing without real credentials
  if (process.env.USE_MOCK_DATA === "true") {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    return generateMockUnifiedData(
      clientId,
      (client?.name as string) ?? "Unknown Client",
      agencyId,
      dateRange,
      previousRange,
      ["ga4", "meta", "linkedin"]
    );
  }

  // STEP 1 — Fetch client name
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  const clientName = (client?.name as string) ?? "Unknown Client";

  // STEP 2 — Fetch all connected data_connections for this client
  const { data: connectionsRaw } = await supabase
    .from("data_connections")
    .select("id, platform, status")
    .eq("client_id", clientId)
    .eq("agency_id", agencyId)
    .eq("status", "connected");

  const connections = (connectionsRaw ?? []) as DataConnection[];

  const ga4Conn = connections.find((c) => c.platform === "google_analytics");
  const metaConn = connections.find((c) => c.platform === "meta_ads");
  const linkedInConn = connections.find((c) => c.platform === "linkedin_ads");

  // STEP 3 — Fire all fetchers in parallel with Promise.allSettled
  const [ga4Result, metaResult, linkedInResult] =
    await Promise.allSettled([
      ga4Conn
        ? fetchGA4Data(supabase, ga4Conn.id, dateRange, previousRange)
        : Promise.resolve<FetchResult<GA4Data> | null>(null),
      metaConn
        ? fetchMetaAdsData(supabase, metaConn.id, dateRange, previousRange)
        : Promise.resolve<FetchResult<MetaAdsData> | null>(null),
      linkedInConn
        ? fetchLinkedInAdsData(
            supabase,
            linkedInConn.id,
            dateRange,
            previousRange
          )
        : Promise.resolve<FetchResult<LinkedInAdsData> | null>(null),
    ]);

  // STEP 4 — Process results
  const fetchErrors: UnifiedReportData["fetchErrors"] = [];
  let ga4Data: GA4Data | null = null;
  let metaData: MetaAdsData | null = null;
  let linkedInData: LinkedInAdsData | null = null;

  // GA4
  if (ga4Result.status === "fulfilled") {
    const result = ga4Result.value;
    if (result === null) {
      // No connection — not an error
    } else if (result.success) {
      ga4Data = result.data;
      if (ga4Conn) {
        await supabase
          .from("data_connections")
          .update({
            status: "connected",
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", ga4Conn.id);
      }
    } else {
      fetchErrors.push({
        platform: "google_analytics",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      if (ga4Conn) {
        await supabase
          .from("data_connections")
          .update({ status: "error", error_message: result.error })
          .eq("id", ga4Conn.id);
      }
    }
  } else {
    const errorMsg = ga4Result.reason instanceof Error
      ? ga4Result.reason.message
      : "Unexpected error";
    fetchErrors.push({
      platform: "google_analytics",
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    if (ga4Conn) {
      await supabase
        .from("data_connections")
        .update({ status: "error", error_message: errorMsg })
        .eq("id", ga4Conn.id);
    }
  }

  // Meta
  if (metaResult.status === "fulfilled") {
    const result = metaResult.value;
    if (result === null) {
      // No connection
    } else if (result.success) {
      metaData = result.data;
      if (metaConn) {
        await supabase
          .from("data_connections")
          .update({
            status: "connected",
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", metaConn.id);
      }
    } else {
      fetchErrors.push({
        platform: "meta_ads",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      if (metaConn) {
        await supabase
          .from("data_connections")
          .update({ status: "error", error_message: result.error })
          .eq("id", metaConn.id);
      }
    }
  } else {
    const errorMsg = metaResult.reason instanceof Error
      ? metaResult.reason.message
      : "Unexpected error";
    fetchErrors.push({
      platform: "meta_ads",
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    if (metaConn) {
      await supabase
        .from("data_connections")
        .update({ status: "error", error_message: errorMsg })
        .eq("id", metaConn.id);
    }
  }

  // LinkedIn
  if (linkedInResult.status === "fulfilled") {
    const result = linkedInResult.value;
    if (result === null) {
      // No connection
    } else if (result.success) {
      linkedInData = result.data;
      if (linkedInConn) {
        await supabase
          .from("data_connections")
          .update({
            status: "connected",
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", linkedInConn.id);
      }
    } else {
      fetchErrors.push({
        platform: "linkedin_ads",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      if (linkedInConn) {
        await supabase
          .from("data_connections")
          .update({ status: "error", error_message: result.error })
          .eq("id", linkedInConn.id);
      }
    }
  } else {
    const errorMsg = linkedInResult.reason instanceof Error
      ? linkedInResult.reason.message
      : "Unexpected error";
    fetchErrors.push({
      platform: "linkedin_ads",
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    if (linkedInConn) {
      await supabase
        .from("data_connections")
        .update({ status: "error", error_message: errorMsg })
        .eq("id", linkedInConn.id);
    }
  }

  return {
    clientId,
    clientName,
    agencyId,
    periodStart: dateRange.start,
    periodEnd: dateRange.end,
    generatedAt: new Date().toISOString(),
    ga4: ga4Data,
    metaAds: metaData,
    linkedInAds: linkedInData,
    fetchErrors,
  };
}
