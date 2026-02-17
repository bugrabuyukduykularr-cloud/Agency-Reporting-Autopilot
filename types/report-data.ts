// ── Date Range ──────────────────────────────────────────────────────────────
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ── Chart Data Point ────────────────────────────────────────────────────────
export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  value: number;
  label?: string;
}

// ── GA4 Data ─────────────────────────────────────────────────────────────────
export interface GA4Data {
  sessions: number;
  sessionsPrevious: number;
  sessionsChange: number;

  users: number;
  usersPrevious: number;
  usersChange: number;

  newUsers: number;
  newUsersPrevious: number;
  newUsersChange: number;

  pageViews: number;
  pageViewsPrevious: number;
  pageViewsChange: number;

  bounceRate: number; // 0-100
  bounceRatePrevious: number;
  bounceRateChange: number;

  avgSessionDuration: number; // seconds
  avgSessionDurationPrevious: number;
  avgSessionDurationChange: number;

  conversions: number;
  conversionsPrevious: number;
  conversionsChange: number;

  topSources: Array<{
    source: string;
    medium: string;
    sessions: number;
    percentage: number;
  }>;

  topPages: Array<{
    pagePath: string;
    pageTitle: string;
    pageViews: number;
    avgDuration: number;
  }>;

  deviceBreakdown: Array<{
    device: string; // 'desktop' | 'mobile' | 'tablet'
    sessions: number;
    percentage: number;
  }>;

  sessionsChart: ChartDataPoint[];

  propertyId: string;
  propertyName: string;
  fetchedAt: string;
}

// ── Meta Ads Data ────────────────────────────────────────────────────────────
export interface MetaAdsData {
  spend: number;
  spendPrevious: number;
  spendChange: number;

  impressions: number;
  impressionsPrevious: number;
  impressionsChange: number;

  reach: number;
  reachPrevious: number;
  reachChange: number;

  frequency: number; // impressions / reach

  clicks: number;
  clicksPrevious: number;
  clicksChange: number;

  ctr: number; // percentage
  ctrPrevious: number;
  ctrChange: number;

  cpc: number;
  cpcPrevious: number;
  cpcChange: number;

  cpm: number;
  cpmPrevious: number;
  cpmChange: number;

  conversions: number;
  conversionsPrevious: number;
  conversionsChange: number;

  costPerConversion: number;
  costPerConversionPrevious: number;
  costPerConversionChange: number;

  roas: number;
  roasPrevious: number;
  roasChange: number;

  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    roas: number;
  }>;

  spendChart: ChartDataPoint[];

  accountId: string;
  accountName: string;
  fetchedAt: string;
}

// ── LinkedIn Ads Data ─────────────────────────────────────────────────────────
export interface LinkedInAdsData {
  spend: number;
  spendPrevious: number;
  spendChange: number;

  impressions: number;
  impressionsPrevious: number;
  impressionsChange: number;

  clicks: number;
  clicksPrevious: number;
  clicksChange: number;

  ctr: number;
  ctrPrevious: number;
  ctrChange: number;

  cpc: number;
  cpcPrevious: number;
  cpcChange: number;

  cpm: number;
  cpmPrevious: number;
  cpmChange: number;

  leads: number;
  leadsPrevious: number;
  leadsChange: number;

  costPerLead: number;
  costPerLeadPrevious: number;
  costPerLeadChange: number;

  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    leads: number;
  }>;

  spendChart: ChartDataPoint[];

  accountId: string;
  accountName: string;
  fetchedAt: string;
}

// ── Unified Report Data ───────────────────────────────────────────────────────
export interface UnifiedReportData {
  clientId: string;
  clientName: string;
  agencyId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  generatedAt: string;

  ga4?: GA4Data | null;
  metaAds?: MetaAdsData | null;
  linkedInAds?: LinkedInAdsData | null;

  fetchErrors: Array<{
    platform: string;
    error: string;
    timestamp: string;
  }>;
}

// ── Fetch Result wrapper ──────────────────────────────────────────────────────
export type FetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; platform: string };
