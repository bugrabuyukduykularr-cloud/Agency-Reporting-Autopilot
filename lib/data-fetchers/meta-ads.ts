import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/oauth/encrypt";
import { calculateChange, getDaysInRange, safeDivide } from "@/lib/utils/date-ranges";
import type {
  DateRange,
  MetaAdsData,
  FetchResult,
  ChartDataPoint,
} from "@/types/report-data";

// ---------------------------------------------------------------------------
// Meta API response types
// ---------------------------------------------------------------------------
interface MetaActionValue {
  action_type: string;
  value: string;
}

interface MetaDailyRow {
  date_start: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: MetaActionValue[];
  action_values?: MetaActionValue[];
  cost_per_action_type?: MetaActionValue[];
  purchase_roas?: MetaActionValue[];
}

interface MetaInsightsResponse {
  data?: MetaDailyRow[];
  error?: { message: string; type: string; code: number };
}

interface MetaCampaign {
  id: string;
  name: string;
  effective_status?: string;
}

interface MetaCampaignsResponse {
  data?: MetaCampaign[];
}

interface MetaCampaignInsightRow extends MetaDailyRow {
  campaign_id?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function n(val: string | undefined): number {
  return parseFloat(val ?? "0") || 0;
}

function extractAction(
  actions: MetaActionValue[] | undefined,
  targetTypes: string[]
): number {
  if (!actions) return 0;
  return actions
    .filter((a) => targetTypes.includes(a.action_type))
    .reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
}

function sumRows(rows: MetaDailyRow[]): {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
} {
  const totals = {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
  };

  for (const row of rows) {
    totals.spend += n(row.spend);
    totals.impressions += n(row.impressions);
    totals.reach += n(row.reach);
    totals.clicks += n(row.clicks);
    totals.conversions += extractAction(row.actions, [
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
    ]);
    totals.conversionValue += extractAction(row.action_values, [
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
    ]);
  }

  return totals;
}

async function metaInsightsRequest(
  accountId: string,
  token: string,
  params: Record<string, string>,
  retries = 1
): Promise<MetaInsightsResponse> {
  const qs = new URLSearchParams({
    access_token: token,
    ...params,
  });
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?${qs.toString()}`;
  const resp = await fetch(url);
  const json = (await resp.json()) as MetaInsightsResponse;

  if (json.error) {
    if (json.error.code === 17 && retries > 0) {
      // Rate limit — wait 60 seconds and retry
      await new Promise((r) => setTimeout(r, 60_000));
      return metaInsightsRequest(accountId, token, params, 0);
    }
    if (json.error.code === 190) {
      throw new Error("Token invalid or expired. Please reconnect Meta Ads.");
    }
    throw new Error(json.error.message);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Main fetcher
// ---------------------------------------------------------------------------
export async function fetchMetaAdsData(
  supabase: SupabaseClient,
  connectionId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<FetchResult<MetaAdsData>> {
  try {
    // STEP 1 — Get token and account details
    const { data: conn } = await supabase
      .from("data_connections")
      .select("access_token, account_id, account_name")
      .eq("id", connectionId)
      .single();

    if (!conn) {
      return {
        success: false,
        error: "Connection not found.",
        platform: "meta_ads",
      };
    }

    let token: string;
    try {
      token = await decryptToken(supabase, conn.access_token as string);
    } catch {
      return {
        success: false,
        error: "Token could not be decrypted. Please reconnect Meta Ads.",
        platform: "meta_ads",
      };
    }

    const accountId = (conn.account_id as string).replace(/^act_/, "");
    const accountName = conn.account_name as string;

    // STEP 2 — Build shared params
    const commonFields =
      "spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,purchase_roas";

    const currentParams = {
      time_range: JSON.stringify({
        since: dateRange.start,
        until: dateRange.end,
      }),
      fields: commonFields,
      level: "account",
      time_increment: "1",
    };

    const previousParams = {
      time_range: JSON.stringify({
        since: previousRange.start,
        until: previousRange.end,
      }),
      fields: commonFields,
      level: "account",
      time_increment: "1",
    };

    const campaignParams = {
      time_range: JSON.stringify({
        since: dateRange.start,
        until: dateRange.end,
      }),
      fields: commonFields + ",campaign_id",
      level: "campaign",
      sort: "spend_descending",
      limit: "5",
    };

    // STEP 3 — Fire requests in parallel
    const [currentResp, previousResp, campaignInsightsResp, campaignNamesResp] =
      await Promise.all([
        metaInsightsRequest(accountId, token, currentParams),
        metaInsightsRequest(accountId, token, previousParams),
        metaInsightsRequest(accountId, token, campaignParams),
        // Fetch campaign names
        fetch(
          `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=id,name,effective_status&access_token=${token}&limit=50`
        ).then((r) => r.json() as Promise<MetaCampaignsResponse>),
      ]);

    // STEP 4 — Sum totals
    const curRows = currentResp.data ?? [];
    const prevRows = previousResp.data ?? [];
    const curTotals = sumRows(curRows);
    const prevTotals = sumRows(prevRows);

    // Derived metrics
    const ctr = safeDivide(curTotals.clicks, curTotals.impressions) * 100;
    const cpc = safeDivide(curTotals.spend, curTotals.clicks);
    const cpm = safeDivide(curTotals.spend, curTotals.impressions) * 1000;
    const costPerConversion = safeDivide(
      curTotals.spend,
      curTotals.conversions
    );
    const roas = Math.max(
      0,
      safeDivide(curTotals.conversionValue, curTotals.spend)
    );

    const prevCtr =
      safeDivide(prevTotals.clicks, prevTotals.impressions) * 100;
    const prevCpc = safeDivide(prevTotals.spend, prevTotals.clicks);
    const prevCpm =
      safeDivide(prevTotals.spend, prevTotals.impressions) * 1000;
    const prevCostPerConversion = safeDivide(
      prevTotals.spend,
      prevTotals.conversions
    );
    const prevConversionValue = prevTotals.conversionValue;
    const prevRoas = Math.max(
      0,
      safeDivide(prevConversionValue, prevTotals.spend)
    );
    const frequency = safeDivide(curTotals.impressions, curTotals.reach);

    // STEP 5 — Build spend chart (daily)
    const dailySpend: Record<string, number> = {};
    for (const row of curRows) {
      dailySpend[row.date_start] = n(row.spend);
    }
    const spendChart: ChartDataPoint[] = getDaysInRange(dateRange).map(
      (date) => ({ date, value: dailySpend[date] ?? 0 })
    );

    // STEP 6 — Campaign breakdown
    const campaignNames = new Map<string, { name: string; status: string }>();
    for (const c of campaignNamesResp.data ?? []) {
      campaignNames.set(c.id, {
        name: c.name,
        status: c.effective_status ?? "ACTIVE",
      });
    }

    const campaigns = (
      (campaignInsightsResp.data ?? []) as MetaCampaignInsightRow[]
    ).map((row) => {
      const campId = row.campaign_id ?? "";
      const campInfo = campaignNames.get(campId);
      const rowTotals = sumRows([row]);
      const campRoas = Math.max(
        0,
        safeDivide(rowTotals.conversionValue, rowTotals.spend)
      );
      return {
        id: campId,
        name: campInfo?.name ?? campId,
        status: campInfo?.status ?? "ACTIVE",
        spend: rowTotals.spend,
        impressions: rowTotals.impressions,
        clicks: rowTotals.clicks,
        ctr:
          safeDivide(rowTotals.clicks, rowTotals.impressions) * 100,
        conversions: rowTotals.conversions,
        roas: campRoas,
      };
    });

    const data: MetaAdsData = {
      spend: curTotals.spend,
      spendPrevious: prevTotals.spend,
      spendChange: calculateChange(curTotals.spend, prevTotals.spend),

      impressions: curTotals.impressions,
      impressionsPrevious: prevTotals.impressions,
      impressionsChange: calculateChange(
        curTotals.impressions,
        prevTotals.impressions
      ),

      reach: curTotals.reach,
      reachPrevious: prevTotals.reach,
      reachChange: calculateChange(curTotals.reach, prevTotals.reach),

      frequency,

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

      conversions: curTotals.conversions,
      conversionsPrevious: prevTotals.conversions,
      conversionsChange: calculateChange(
        curTotals.conversions,
        prevTotals.conversions
      ),

      costPerConversion,
      costPerConversionPrevious: prevCostPerConversion,
      costPerConversionChange: calculateChange(
        costPerConversion,
        prevCostPerConversion
      ),

      roas,
      roasPrevious: prevRoas,
      roasChange: calculateChange(roas, prevRoas),

      campaigns,
      spendChart,

      accountId,
      accountName,
      fetchedAt: new Date().toISOString(),
    };

    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error fetching Meta Ads data";
    console.error("[fetchMetaAdsData] error:", message);
    return { success: false, error: message, platform: "meta_ads" };
  }
}
