import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureValidToken } from "@/lib/oauth/token-refresh";
import { calculateChange, getDaysInRange } from "@/lib/utils/date-ranges";
import type { DateRange, GA4Data, FetchResult, ChartDataPoint } from "@/types/report-data";

// ---------------------------------------------------------------------------
// GA4 API response types
// ---------------------------------------------------------------------------
interface GA4MetricHeader {
  name: string;
  type: string;
}

interface GA4DimensionHeader {
  name: string;
}

interface GA4Value {
  value: string;
}

interface GA4Row {
  dimensionValues: GA4Value[];
  metricValues: GA4Value[];
}

interface GA4ReportResponse {
  rows?: GA4Row[];
  dimensionHeaders?: GA4DimensionHeader[];
  metricHeaders?: GA4MetricHeader[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseMetricRow(
  row: GA4Row,
  metricNames: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  metricNames.forEach((name, idx) => {
    result[name] = parseFloat(row.metricValues[idx]?.value ?? "0") || 0;
  });
  return result;
}

function parseDimMetricRow(
  row: GA4Row,
  dimNames: string[],
  metricNames: string[]
): { dims: Record<string, string>; metrics: Record<string, number> } {
  const dims: Record<string, string> = {};
  const metrics: Record<string, number> = {};
  dimNames.forEach((name, idx) => {
    dims[name] = row.dimensionValues[idx]?.value ?? "";
  });
  metricNames.forEach((name, idx) => {
    metrics[name] = parseFloat(row.metricValues[idx]?.value ?? "0") || 0;
  });
  return { dims, metrics };
}

async function ga4Request(
  propertyId: string,
  token: string,
  body: Record<string, unknown>
): Promise<GA4ReportResponse> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!retry.ok) throw new Error(`GA4 API error ${retry.status}`);
    return (await retry.json()) as GA4ReportResponse;
  }

  if (!resp.ok) throw new Error(`GA4 API error ${resp.status}`);
  return (await resp.json()) as GA4ReportResponse;
}

// ---------------------------------------------------------------------------
// Main fetcher
// ---------------------------------------------------------------------------
export async function fetchGA4Data(
  supabase: SupabaseClient,
  connectionId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<FetchResult<GA4Data>> {
  try {
    // STEP 1 — Get valid token + connection details
    const token = await ensureValidToken(supabase, connectionId);
    if (!token) {
      return {
        success: false,
        error: "Token expired or invalid. Please reconnect Google Analytics.",
        platform: "google_analytics",
      };
    }

    const { data: conn } = await supabase
      .from("data_connections")
      .select("account_id, account_name")
      .eq("id", connectionId)
      .single();

    const propertyId = (conn?.account_id as string) ?? "";
    const propertyName = (conn?.account_name as string) ?? "";

    // STEP 2 — Core metrics body builder
    const coreMetrics = [
      "sessions",
      "totalUsers",
      "newUsers",
      "screenPageViews",
      "bounceRate",
      "averageSessionDuration",
      "conversions",
    ];

    const coreBody = (start: string, end: string) => ({
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: coreMetrics.map((name) => ({ name })),
      dimensions: [],
    });

    // STEP 3 — Fire all 5 requests + previous period in parallel
    // Add 100ms delay between requests to respect GA4 rate limits
    const [
      currentCoreResp,
      sourcesResp,
      pagesResp,
      devicesResp,
      dailyResp,
      prevCoreResp,
    ] = await Promise.all([
      ga4Request(propertyId, token, coreBody(dateRange.start, dateRange.end)),
      new Promise<GA4ReportResponse>((resolve) =>
        setTimeout(
          () =>
            ga4Request(propertyId, token, {
              dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
              metrics: [{ name: "sessions" }],
              dimensions: [
                { name: "sessionSource" },
                { name: "sessionMedium" },
              ],
              orderBys: [
                { metric: { metricName: "sessions" }, desc: true },
              ],
              limit: 5,
            }).then(resolve),
          100
        )
      ),
      new Promise<GA4ReportResponse>((resolve) =>
        setTimeout(
          () =>
            ga4Request(propertyId, token, {
              dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
              metrics: [
                { name: "screenPageViews" },
                { name: "averageSessionDuration" },
              ],
              dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
              orderBys: [
                { metric: { metricName: "screenPageViews" }, desc: true },
              ],
              limit: 5,
            }).then(resolve),
          200
        )
      ),
      new Promise<GA4ReportResponse>((resolve) =>
        setTimeout(
          () =>
            ga4Request(propertyId, token, {
              dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
              metrics: [{ name: "sessions" }],
              dimensions: [{ name: "deviceCategory" }],
            }).then(resolve),
          300
        )
      ),
      new Promise<GA4ReportResponse>((resolve) =>
        setTimeout(
          () =>
            ga4Request(propertyId, token, {
              dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
              metrics: [{ name: "sessions" }],
              dimensions: [{ name: "date" }],
              orderBys: [{ dimension: { dimensionName: "date" } }],
            }).then(resolve),
          400
        )
      ),
      new Promise<GA4ReportResponse>((resolve) =>
        setTimeout(
          () =>
            ga4Request(
              propertyId,
              token,
              coreBody(previousRange.start, previousRange.end)
            ).then(resolve),
          500
        )
      ),
    ]);

    // STEP 4 — Parse core metrics (current)
    const currentRow = currentCoreResp.rows?.[0];
    const cur = currentRow
      ? parseMetricRow(currentRow, coreMetrics)
      : ({} as Record<string, number>);

    const prevRow = prevCoreResp.rows?.[0];
    const prev = prevRow
      ? parseMetricRow(prevRow, coreMetrics)
      : ({} as Record<string, number>);

    const getValue = (obj: Record<string, number>, key: string) =>
      obj[key] ?? 0;

    // STEP 5 — Parse top sources
    const totalSessions = getValue(cur, "sessions") || 1;
    const topSources = (sourcesResp.rows ?? []).map((row) => {
      const { dims, metrics } = parseDimMetricRow(
        row,
        ["sessionSource", "sessionMedium"],
        ["sessions"]
      );
      return {
        source: dims["sessionSource"] ?? "(direct)",
        medium: dims["sessionMedium"] ?? "(none)",
        sessions: metrics["sessions"] ?? 0,
        percentage:
          Math.round((metrics["sessions"] / totalSessions) * 1000) / 10,
      };
    });

    // STEP 6 — Parse top pages
    const topPages = (pagesResp.rows ?? []).map((row) => {
      const { dims, metrics } = parseDimMetricRow(
        row,
        ["pagePath", "pageTitle"],
        ["screenPageViews", "averageSessionDuration"]
      );
      return {
        pagePath: dims["pagePath"] ?? "/",
        pageTitle: dims["pageTitle"] ?? "",
        pageViews: metrics["screenPageViews"] ?? 0,
        avgDuration: metrics["averageSessionDuration"] ?? 0,
      };
    });

    // STEP 7 — Parse device breakdown
    const totalDeviceSessions =
      (devicesResp.rows ?? []).reduce((sum, row) => {
        return sum + (parseFloat(row.metricValues[0]?.value ?? "0") || 0);
      }, 0) || 1;

    const deviceBreakdown = (devicesResp.rows ?? []).map((row) => {
      const { dims, metrics } = parseDimMetricRow(
        row,
        ["deviceCategory"],
        ["sessions"]
      );
      return {
        device: dims["deviceCategory"] ?? "desktop",
        sessions: metrics["sessions"] ?? 0,
        percentage:
          Math.round((metrics["sessions"] / totalDeviceSessions) * 1000) / 10,
      };
    });

    // STEP 8 — Parse daily sessions chart
    const dailyByDate: Record<string, number> = {};
    for (const row of dailyResp.rows ?? []) {
      const { dims, metrics } = parseDimMetricRow(
        row,
        ["date"],
        ["sessions"]
      );
      // GA4 date format: YYYYMMDD → YYYY-MM-DD
      const rawDate = dims["date"] ?? "";
      const formatted = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      dailyByDate[formatted] = metrics["sessions"] ?? 0;
    }

    const sessionsChart: ChartDataPoint[] = getDaysInRange(dateRange).map(
      (date) => ({ date, value: dailyByDate[date] ?? 0 })
    );

    // STEP 9 — Build GA4Data object
    const data: GA4Data = {
      sessions: getValue(cur, "sessions"),
      sessionsPrevious: getValue(prev, "sessions"),
      sessionsChange: calculateChange(
        getValue(cur, "sessions"),
        getValue(prev, "sessions")
      ),

      users: getValue(cur, "totalUsers"),
      usersPrevious: getValue(prev, "totalUsers"),
      usersChange: calculateChange(
        getValue(cur, "totalUsers"),
        getValue(prev, "totalUsers")
      ),

      newUsers: getValue(cur, "newUsers"),
      newUsersPrevious: getValue(prev, "newUsers"),
      newUsersChange: calculateChange(
        getValue(cur, "newUsers"),
        getValue(prev, "newUsers")
      ),

      pageViews: getValue(cur, "screenPageViews"),
      pageViewsPrevious: getValue(prev, "screenPageViews"),
      pageViewsChange: calculateChange(
        getValue(cur, "screenPageViews"),
        getValue(prev, "screenPageViews")
      ),

      bounceRate: Math.round(getValue(cur, "bounceRate") * 1000) / 10,
      bounceRatePrevious: Math.round(getValue(prev, "bounceRate") * 1000) / 10,
      bounceRateChange: calculateChange(
        getValue(cur, "bounceRate"),
        getValue(prev, "bounceRate")
      ),

      avgSessionDuration: getValue(cur, "averageSessionDuration"),
      avgSessionDurationPrevious: getValue(prev, "averageSessionDuration"),
      avgSessionDurationChange: calculateChange(
        getValue(cur, "averageSessionDuration"),
        getValue(prev, "averageSessionDuration")
      ),

      conversions: getValue(cur, "conversions"),
      conversionsPrevious: getValue(prev, "conversions"),
      conversionsChange: calculateChange(
        getValue(cur, "conversions"),
        getValue(prev, "conversions")
      ),

      topSources,
      topPages,
      deviceBreakdown,
      sessionsChart,

      propertyId,
      propertyName,
      fetchedAt: new Date().toISOString(),
    };

    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching GA4 data";
    console.error("[fetchGA4Data] error:", message);
    return { success: false, error: message, platform: "google_analytics" };
  }
}
