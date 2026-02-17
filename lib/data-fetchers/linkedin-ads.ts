import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/oauth/encrypt";
import {
  calculateChange,
  getDaysInRange,
  safeDivide,
} from "@/lib/utils/date-ranges";
import type {
  DateRange,
  LinkedInAdsData,
  FetchResult,
  ChartDataPoint,
} from "@/types/report-data";

// ---------------------------------------------------------------------------
// LinkedIn API response types
// ---------------------------------------------------------------------------
interface LinkedInDateRange {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
}

interface LinkedInAnalyticsElement {
  dateRange?: LinkedInDateRange;
  clicks?: number;
  impressions?: number;
  costInLocalCurrency?: string;
  leads?: number;
  oneClickLeads?: number;
  externalWebsiteConversions?: number;
  pivotValues?: string[];
}

interface LinkedInAnalyticsResponse {
  elements?: LinkedInAnalyticsElement[];
  status?: number;
  serviceErrorCode?: number;
  message?: string;
}

interface LinkedInCampaign {
  id: number;
  name?: { localized?: Record<string, string> };
  status?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDateFromLinkedIn(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function linkedInDateParams(range: DateRange): Record<string, string> {
  const start = range.start.split("-");
  const end = range.end.split("-");
  return {
    "dateRange.start.year": start[0] ?? "",
    "dateRange.start.month": String(parseInt(start[1] ?? "1")),
    "dateRange.start.day": String(parseInt(start[2] ?? "1")),
    "dateRange.end.year": end[0] ?? "",
    "dateRange.end.month": String(parseInt(end[1] ?? "1")),
    "dateRange.end.day": String(parseInt(end[2] ?? "1")),
  };
}

function sumLinkedInRows(elements: LinkedInAnalyticsElement[]): {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
} {
  const totals = { spend: 0, impressions: 0, clicks: 0, leads: 0 };
  for (const el of elements) {
    totals.spend += parseFloat(el.costInLocalCurrency ?? "0") || 0;
    totals.impressions += el.impressions ?? 0;
    totals.clicks += el.clicks ?? 0;
    totals.leads +=
      (el.leads ?? 0) +
      (el.oneClickLeads ?? 0) +
      (el.externalWebsiteConversions ?? 0);
  }
  return totals;
}

async function linkedInApiRequest(
  path: string,
  token: string,
  params: Record<string, string>,
  retries = 1
): Promise<LinkedInAnalyticsResponse> {
  const qs = new URLSearchParams(params);
  const resp = await fetch(
    `https://api.linkedin.com/v2/${path}?${qs.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  if (resp.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 30_000));
    return linkedInApiRequest(path, token, params, 0);
  }

  const json = (await resp.json()) as LinkedInAnalyticsResponse;

  if (resp.status === 401) {
    throw new Error("Token invalid or expired. Please reconnect LinkedIn Ads.");
  }
  if (!resp.ok) {
    throw new Error(json.message ?? `LinkedIn API error ${resp.status}`);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Main fetcher
// ---------------------------------------------------------------------------
export async function fetchLinkedInAdsData(
  supabase: SupabaseClient,
  connectionId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<FetchResult<LinkedInAdsData>> {
  try {
    // STEP 1 — Get token + account
    const { data: conn } = await supabase
      .from("data_connections")
      .select("access_token, account_id, account_name")
      .eq("id", connectionId)
      .single();

    if (!conn) {
      return {
        success: false,
        error: "Connection not found.",
        platform: "linkedin_ads",
      };
    }

    let token: string;
    try {
      token = await decryptToken(supabase, conn.access_token as string);
    } catch {
      return {
        success: false,
        error: "Token could not be decrypted. Please reconnect LinkedIn Ads.",
        platform: "linkedin_ads",
      };
    }

    const rawAccountId = (conn.account_id as string).replace(
      /^urn:li:sponsoredAccount:/,
      ""
    );
    const accountUrn = `urn:li:sponsoredAccount:${rawAccountId}`;
    const accountName = conn.account_name as string;

    const commonFields =
      "dateRange,clicks,impressions,costInLocalCurrency,leads,oneClickLeads,externalWebsiteConversions";

    // STEP 2 — Account-level analytics (current + previous + campaigns) in parallel
    const [currentResp, previousResp, campaignResp] = await Promise.all([
      linkedInApiRequest("adAnalyticsV2", token, {
        q: "statistics",
        pivot: "ACCOUNT",
        ...linkedInDateParams(dateRange),
        timeGranularity: "DAILY",
        accounts: accountUrn,
        fields: commonFields,
      }),
      linkedInApiRequest("adAnalyticsV2", token, {
        q: "statistics",
        pivot: "ACCOUNT",
        ...linkedInDateParams(previousRange),
        timeGranularity: "DAILY",
        accounts: accountUrn,
        fields: commonFields,
      }),
      linkedInApiRequest("adAnalyticsV2", token, {
        q: "statistics",
        pivot: "CAMPAIGN",
        ...linkedInDateParams(dateRange),
        timeGranularity: "ALL",
        accounts: accountUrn,
        fields: "costInLocalCurrency,clicks,impressions,leads,oneClickLeads,externalWebsiteConversions",
        count: "5",
      }),
    ]);

    // STEP 3 — Sum totals
    const curElements = currentResp.elements ?? [];
    const prevElements = previousResp.elements ?? [];
    const curTotals = sumLinkedInRows(curElements);
    const prevTotals = sumLinkedInRows(prevElements);

    // Derived metrics
    const ctr = safeDivide(curTotals.clicks, curTotals.impressions) * 100;
    const cpc = safeDivide(curTotals.spend, curTotals.clicks);
    const cpm = safeDivide(curTotals.spend, curTotals.impressions) * 1000;
    const costPerLead = safeDivide(curTotals.spend, curTotals.leads);

    const prevCtr = safeDivide(prevTotals.clicks, prevTotals.impressions) * 100;
    const prevCpc = safeDivide(prevTotals.spend, prevTotals.clicks);
    const prevCpm = safeDivide(prevTotals.spend, prevTotals.impressions) * 1000;
    const prevCostPerLead = safeDivide(prevTotals.spend, prevTotals.leads);

    // STEP 4 — Build spend chart
    const dailySpend: Record<string, number> = {};
    for (const el of curElements) {
      if (el.dateRange?.start) {
        const dateStr = parseDateFromLinkedIn(el.dateRange.start);
        dailySpend[dateStr] = parseFloat(el.costInLocalCurrency ?? "0") || 0;
      }
    }
    const spendChart: ChartDataPoint[] = getDaysInRange(dateRange).map(
      (date) => ({ date, value: dailySpend[date] ?? 0 })
    );

    // STEP 5 — Campaign breakdown
    const campaignElements = campaignResp.elements ?? [];
    const campaignIds = campaignElements
      .map((el) => {
        const urn = el.pivotValues?.[0] ?? "";
        return urn.replace(/^urn:li:sponsoredCampaign:/, "");
      })
      .filter(Boolean);

    // Fetch campaign names
    const campaignDetails = await Promise.all(
      campaignIds.map(async (id) => {
        try {
          const resp = await fetch(
            `https://api.linkedin.com/v2/adCampaignsV2/${id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "LinkedIn-Version": "202401",
                "X-Restli-Protocol-Version": "2.0.0",
              },
            }
          );
          const data = (await resp.json()) as LinkedInCampaign;
          const localizedName = data.name?.localized;
          const name = localizedName
            ? (Object.values(localizedName)[0] ?? id)
            : id;
          return { id, name, status: data.status ?? "ACTIVE" };
        } catch {
          return { id, name: id, status: "ACTIVE" };
        }
      })
    );

    const campaignMap = new Map(campaignDetails.map((c) => [c.id, c]));

    const campaigns = campaignElements.map((el) => {
      const urn = el.pivotValues?.[0] ?? "";
      const id = urn.replace(/^urn:li:sponsoredCampaign:/, "");
      const info = campaignMap.get(id);
      const totals = sumLinkedInRows([el]);
      return {
        id,
        name: info?.name ?? id,
        status: info?.status ?? "ACTIVE",
        spend: totals.spend,
        impressions: totals.impressions,
        clicks: totals.clicks,
        ctr: safeDivide(totals.clicks, totals.impressions) * 100,
        leads: totals.leads,
      };
    });

    const data: LinkedInAdsData = {
      spend: curTotals.spend,
      spendPrevious: prevTotals.spend,
      spendChange: calculateChange(curTotals.spend, prevTotals.spend),

      impressions: curTotals.impressions,
      impressionsPrevious: prevTotals.impressions,
      impressionsChange: calculateChange(
        curTotals.impressions,
        prevTotals.impressions
      ),

      clicks: curTotals.clicks,
      clicksPrevious: prevTotals.clicks,
      clicksChange: calculateChange(curTotals.clicks, prevTotals.clicks),

      ctr,
      ctrPrevious: prevCtr,
      ctrChange: calculateChange(ctr, prevCtr),

      cpc,
      cpcPrevious: prevCpc,
      cpcChange: calculateChange(cpc, prevCpc),

      cpm,
      cpmPrevious: prevCpm,
      cpmChange: calculateChange(cpm, prevCpm),

      leads: curTotals.leads,
      leadsPrevious: prevTotals.leads,
      leadsChange: calculateChange(curTotals.leads, prevTotals.leads),

      costPerLead,
      costPerLeadPrevious: prevCostPerLead,
      costPerLeadChange: calculateChange(costPerLead, prevCostPerLead),

      campaigns,
      spendChart,

      accountId: rawAccountId,
      accountName,
      fetchedAt: new Date().toISOString(),
    };

    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error fetching LinkedIn Ads data";
    console.error("[fetchLinkedInAdsData] error:", message);
    return { success: false, error: message, platform: "linkedin_ads" };
  }
}
