import { getDaysInRange, safeDivide } from "@/lib/utils/date-ranges";
import type {
  DateRange,
  GA4Data,
  MetaAdsData,
  LinkedInAdsData,
  UnifiedReportData,
  ChartDataPoint,
} from "@/types/report-data";

// ---------------------------------------------------------------------------
// Seeded random helpers — deterministic per clientId for consistent previews
// ---------------------------------------------------------------------------
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.round(randBetween(rng, min, max));
}

function withVariation(
  rng: () => number,
  value: number,
  variation = 0.2
): number {
  return value * (1 - variation + rng() * variation * 2);
}

function buildDailyChart(
  rng: () => number,
  days: string[],
  baseValue: number,
  variation = 0.3
): ChartDataPoint[] {
  return days.map((date) => ({
    date,
    value: Math.max(0, Math.round(withVariation(rng, baseValue, variation))),
  }));
}

// ---------------------------------------------------------------------------
// Mock GA4 Data
// ---------------------------------------------------------------------------
export function generateMockGA4Data(
  dateRange: DateRange,
  seed = 42
): GA4Data {
  const rng = seededRandom(seed);
  const days = getDaysInRange(dateRange);

  const sessions = randInt(rng, 2000, 8000);
  const sessionsPrevious = Math.round(withVariation(rng, sessions));
  const users = Math.round(sessions * randBetween(rng, 0.7, 0.9));
  const usersPrevious = Math.round(withVariation(rng, users));
  const newUsers = Math.round(users * randBetween(rng, 0.4, 0.7));
  const newUsersPrevious = Math.round(withVariation(rng, newUsers));
  const pageViews = Math.round(sessions * randBetween(rng, 2.5, 4.5));
  const pageViewsPrevious = Math.round(withVariation(rng, pageViews));
  const bounceRate = randBetween(rng, 45, 65);
  const bounceRatePrevious = withVariation(rng, bounceRate, 0.1);
  const avgDuration = randBetween(rng, 90, 240);
  const avgDurationPrevious = withVariation(rng, avgDuration, 0.15);
  const conversions = randInt(rng, 20, 150);
  const conversionsPrevious = Math.round(withVariation(rng, conversions));

  const sources = [
    { source: "google", medium: "organic" },
    { source: "(direct)", medium: "(none)" },
    { source: "google", medium: "cpc" },
    { source: "facebook.com", medium: "referral" },
    { source: "newsletter", medium: "email" },
  ];
  const topSources = sources.map((s, i) => {
    const share = randBetween(rng, 0.08, 0.35 - i * 0.04);
    return {
      ...s,
      sessions: Math.round(sessions * share),
      percentage: Math.round(share * 1000) / 10,
    };
  });

  const pages = ["/", "/services", "/about", "/contact", "/blog"];
  const topPages = pages.map((p) => ({
    pagePath: p,
    pageTitle: p === "/" ? "Home" : p.slice(1).replace(/-/g, " "),
    pageViews: randInt(rng, 100, 2000),
    avgDuration: randBetween(rng, 30, 200),
  }));

  const desktopShare = randBetween(rng, 0.45, 0.65);
  const mobileShare = randBetween(rng, 0.28, 0.45);
  const tabletShare = 1 - desktopShare - mobileShare;
  const deviceBreakdown = [
    {
      device: "desktop",
      sessions: Math.round(sessions * desktopShare),
      percentage: Math.round(desktopShare * 1000) / 10,
    },
    {
      device: "mobile",
      sessions: Math.round(sessions * mobileShare),
      percentage: Math.round(mobileShare * 1000) / 10,
    },
    {
      device: "tablet",
      sessions: Math.round(sessions * tabletShare),
      percentage: Math.round(tabletShare * 1000) / 10,
    },
  ];

  const dailySessions = Math.round(sessions / days.length);
  const sessionsChart = buildDailyChart(rng, days, dailySessions);

  return {
    sessions,
    sessionsPrevious,
    sessionsChange:
      Math.round(((sessions - sessionsPrevious) / sessionsPrevious) * 1000) /
      10,
    users,
    usersPrevious,
    usersChange:
      Math.round(((users - usersPrevious) / usersPrevious) * 1000) / 10,
    newUsers,
    newUsersPrevious,
    newUsersChange:
      Math.round(((newUsers - newUsersPrevious) / newUsersPrevious) * 1000) /
      10,
    pageViews,
    pageViewsPrevious,
    pageViewsChange:
      Math.round(((pageViews - pageViewsPrevious) / pageViewsPrevious) * 1000) /
      10,
    bounceRate: Math.round(bounceRate * 10) / 10,
    bounceRatePrevious: Math.round(bounceRatePrevious * 10) / 10,
    bounceRateChange:
      Math.round(((bounceRate - bounceRatePrevious) / bounceRatePrevious) * 1000) /
      10,
    avgSessionDuration: Math.round(avgDuration),
    avgSessionDurationPrevious: Math.round(avgDurationPrevious),
    avgSessionDurationChange:
      Math.round(
        ((avgDuration - avgDurationPrevious) / avgDurationPrevious) * 1000
      ) / 10,
    conversions,
    conversionsPrevious,
    conversionsChange:
      Math.round(
        ((conversions - conversionsPrevious) / conversionsPrevious) * 1000
      ) / 10,
    topSources,
    topPages,
    deviceBreakdown,
    sessionsChart,
    propertyId: "properties/123456789",
    propertyName: "Mock GA4 Property",
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Mock Meta Ads Data
// ---------------------------------------------------------------------------
export function generateMockMetaAdsData(
  dateRange: DateRange,
  seed = 43
): MetaAdsData {
  const rng = seededRandom(seed);
  const days = getDaysInRange(dateRange);

  const spend = Math.round(randBetween(rng, 500, 3000) * 100) / 100;
  const spendPrevious = Math.round(withVariation(rng, spend) * 100) / 100;
  const impressions = randInt(rng, 50000, 300000);
  const impressionsPrevious = Math.round(withVariation(rng, impressions));
  const reach = Math.round(impressions * randBetween(rng, 0.55, 0.85));
  const reachPrevious = Math.round(withVariation(rng, reach));
  const frequency = safeDivide(impressions, reach);
  const clicks = randInt(rng, 800, 8000);
  const clicksPrevious = Math.round(withVariation(rng, clicks));
  const ctr = safeDivide(clicks, impressions) * 100;
  const ctrPrevious = safeDivide(clicksPrevious, impressionsPrevious) * 100;
  const cpc = safeDivide(spend, clicks);
  const cpcPrevious = safeDivide(spendPrevious, clicksPrevious);
  const cpm = safeDivide(spend, impressions) * 1000;
  const cpmPrevious = safeDivide(spendPrevious, impressionsPrevious) * 1000;
  const conversions = randInt(rng, 15, 120);
  const conversionsPrevious = Math.round(withVariation(rng, conversions));
  const conversionValue = spend * randBetween(rng, 2, 8);
  const conversionValuePrev = spendPrevious * randBetween(rng, 2, 8);
  const costPerConversion = safeDivide(spend, conversions);
  const costPerConversionPrevious = safeDivide(spendPrevious, conversionsPrevious);
  const roas = Math.max(0, safeDivide(conversionValue, spend));
  const roasPrevious = Math.max(0, safeDivide(conversionValuePrev, spendPrevious));

  const campaignNames = [
    "Brand Awareness Campaign",
    "Retargeting - Website Visitors",
    "Lead Gen - Cold Audience",
    "Product Promotion",
    "Seasonal Sale Campaign",
  ];
  const campaigns = campaignNames.slice(0, 3).map((name, i) => {
    const campSpend = Math.round(spend * randBetween(rng, 0.15, 0.45) * 100) / 100;
    const campImpressions = randInt(rng, 5000, 80000);
    const campClicks = randInt(rng, 100, 2000);
    const campConversions = randInt(rng, 2, 30);
    const campConvValue = campSpend * randBetween(rng, 1.5, 6);
    return {
      id: `camp_00${i + 1}`,
      name,
      status: "ACTIVE",
      spend: campSpend,
      impressions: campImpressions,
      clicks: campClicks,
      ctr: safeDivide(campClicks, campImpressions) * 100,
      conversions: campConversions,
      roas: Math.max(0, safeDivide(campConvValue, campSpend)),
    };
  });

  const dailySpend = Math.round((spend / days.length) * 100) / 100;
  const spendChart = buildDailyChart(rng, days, dailySpend);

  return {
    spend,
    spendPrevious,
    spendChange: Math.round(((spend - spendPrevious) / spendPrevious) * 1000) / 10,
    impressions,
    impressionsPrevious,
    impressionsChange:
      Math.round(((impressions - impressionsPrevious) / impressionsPrevious) * 1000) / 10,
    reach,
    reachPrevious,
    reachChange: Math.round(((reach - reachPrevious) / reachPrevious) * 1000) / 10,
    frequency: Math.round(frequency * 100) / 100,
    clicks,
    clicksPrevious,
    clicksChange: Math.round(((clicks - clicksPrevious) / clicksPrevious) * 1000) / 10,
    ctr: Math.round(ctr * 100) / 100,
    ctrPrevious: Math.round(ctrPrevious * 100) / 100,
    ctrChange: Math.round(((ctr - ctrPrevious) / ctrPrevious) * 1000) / 10,
    cpc: Math.round(cpc * 100) / 100,
    cpcPrevious: Math.round(cpcPrevious * 100) / 100,
    cpcChange: Math.round(((cpc - cpcPrevious) / cpcPrevious) * 1000) / 10,
    cpm: Math.round(cpm * 100) / 100,
    cpmPrevious: Math.round(cpmPrevious * 100) / 100,
    cpmChange: Math.round(((cpm - cpmPrevious) / cpmPrevious) * 1000) / 10,
    conversions,
    conversionsPrevious,
    conversionsChange:
      Math.round(((conversions - conversionsPrevious) / conversionsPrevious) * 1000) / 10,
    costPerConversion: Math.round(costPerConversion * 100) / 100,
    costPerConversionPrevious: Math.round(costPerConversionPrevious * 100) / 100,
    costPerConversionChange:
      Math.round(((costPerConversion - costPerConversionPrevious) / costPerConversionPrevious) * 1000) / 10,
    roas: Math.round(roas * 100) / 100,
    roasPrevious: Math.round(roasPrevious * 100) / 100,
    roasChange: Math.round(((roas - roasPrevious) / roasPrevious) * 1000) / 10,
    campaigns,
    spendChart,
    accountId: "mock_act_123456",
    accountName: "Mock Meta Ad Account",
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Mock LinkedIn Ads Data
// ---------------------------------------------------------------------------
export function generateMockLinkedInAdsData(
  dateRange: DateRange,
  seed = 44
): LinkedInAdsData {
  const rng = seededRandom(seed);
  const days = getDaysInRange(dateRange);

  const spend = Math.round(randBetween(rng, 200, 1500) * 100) / 100;
  const spendPrevious = Math.round(withVariation(rng, spend) * 100) / 100;
  const impressions = randInt(rng, 20000, 120000);
  const impressionsPrevious = Math.round(withVariation(rng, impressions));
  const clicks = randInt(rng, 80, 1440);
  const clicksPrevious = Math.round(withVariation(rng, clicks));
  const ctr = safeDivide(clicks, impressions) * 100;
  const ctrPrevious = safeDivide(clicksPrevious, impressionsPrevious) * 100;
  const cpc = safeDivide(spend, clicks);
  const cpcPrevious = safeDivide(spendPrevious, clicksPrevious);
  const cpm = safeDivide(spend, impressions) * 1000;
  const cpmPrevious = safeDivide(spendPrevious, impressionsPrevious) * 1000;
  const leads = randInt(rng, 5, 30);
  const leadsPrevious = Math.round(withVariation(rng, leads));
  const costPerLead = safeDivide(spend, leads);
  const costPerLeadPrevious = safeDivide(spendPrevious, leadsPrevious);

  const campaignNames = [
    "B2B Lead Generation",
    "Brand Awareness - Tech",
    "Retargeting - Website",
  ];
  const campaigns = campaignNames.map((name, i) => {
    const campSpend = Math.round(spend * randBetween(rng, 0.2, 0.5) * 100) / 100;
    const campImpressions = randInt(rng, 3000, 40000);
    const campClicks = randInt(rng, 20, 400);
    const campLeads = randInt(rng, 1, 10);
    return {
      id: `li_camp_00${i + 1}`,
      name,
      status: "ACTIVE",
      spend: campSpend,
      impressions: campImpressions,
      clicks: campClicks,
      ctr: safeDivide(campClicks, campImpressions) * 100,
      leads: campLeads,
    };
  });

  const dailySpend = Math.round((spend / days.length) * 100) / 100;
  const spendChart = buildDailyChart(rng, days, dailySpend);

  return {
    spend,
    spendPrevious,
    spendChange: Math.round(((spend - spendPrevious) / spendPrevious) * 1000) / 10,
    impressions,
    impressionsPrevious,
    impressionsChange:
      Math.round(((impressions - impressionsPrevious) / impressionsPrevious) * 1000) / 10,
    clicks,
    clicksPrevious,
    clicksChange: Math.round(((clicks - clicksPrevious) / clicksPrevious) * 1000) / 10,
    ctr: Math.round(ctr * 100) / 100,
    ctrPrevious: Math.round(ctrPrevious * 100) / 100,
    ctrChange: Math.round(((ctr - ctrPrevious) / ctrPrevious) * 1000) / 10,
    cpc: Math.round(cpc * 100) / 100,
    cpcPrevious: Math.round(cpcPrevious * 100) / 100,
    cpcChange: Math.round(((cpc - cpcPrevious) / cpcPrevious) * 1000) / 10,
    cpm: Math.round(cpm * 100) / 100,
    cpmPrevious: Math.round(cpmPrevious * 100) / 100,
    cpmChange: Math.round(((cpm - cpmPrevious) / cpmPrevious) * 1000) / 10,
    leads,
    leadsPrevious,
    leadsChange: Math.round(((leads - leadsPrevious) / leadsPrevious) * 1000) / 10,
    costPerLead: Math.round(costPerLead * 100) / 100,
    costPerLeadPrevious: Math.round(costPerLeadPrevious * 100) / 100,
    costPerLeadChange:
      Math.round(((costPerLead - costPerLeadPrevious) / costPerLeadPrevious) * 1000) / 10,
    campaigns,
    spendChart,
    accountId: "mock_li_789012",
    accountName: "Mock LinkedIn Ad Account",
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Generate full mock UnifiedReportData
// ---------------------------------------------------------------------------
export function generateMockUnifiedData(
  clientId: string,
  clientName: string,
  agencyId: string,
  dateRange: DateRange,
  previousRange: DateRange,
  platforms: ("ga4" | "meta" | "linkedin")[] = ["ga4", "meta", "linkedin"]
): UnifiedReportData {
  // Use clientId as seed source for determinism
  const seed = clientId
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return {
    clientId,
    clientName,
    agencyId,
    periodStart: dateRange.start,
    periodEnd: dateRange.end,
    generatedAt: new Date().toISOString(),
    ga4: platforms.includes("ga4")
      ? generateMockGA4Data(dateRange, seed + 1)
      : null,
    metaAds: platforms.includes("meta")
      ? generateMockMetaAdsData(dateRange, seed + 2)
      : null,
    linkedInAds: platforms.includes("linkedin")
      ? generateMockLinkedInAdsData(dateRange, seed + 3)
      : null,
    fetchErrors: [],
  };
}
