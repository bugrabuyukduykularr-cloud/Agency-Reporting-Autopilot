import type { UnifiedReportData } from "@/types/report-data";

// ── Number formatters ─────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export interface ChangeDisplay {
  text: string;       // "+12.3%" or "-4.1%" or "~0%"
  isPositive: boolean;
  isNeutral: boolean; // within ±1%
}

export function formatChange(value: number): ChangeDisplay {
  const abs = Math.abs(value);
  if (abs <= 1) {
    return { text: "~0%", isPositive: false, isNeutral: true };
  }
  if (value > 0) {
    return { text: `+${value.toFixed(1)}%`, isPositive: true, isNeutral: false };
  }
  return { text: `${value.toFixed(1)}%`, isPositive: false, isNeutral: false };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ── Top metric summary ────────────────────────────────────────────────────────

export interface TopMetricEntry {
  label: string;
  value: string;
  change: ChangeDisplay;
  platform: string;
}

/**
 * Returns the 3 most important metrics across all connected platforms.
 * Priority: conversions/leads → ROAS → sessions
 */
export function getTopMetricSummary(data: UnifiedReportData): TopMetricEntry[] {
  const entries: TopMetricEntry[] = [];

  if (data.ga4) {
    entries.push({
      label: "Sessions",
      value: formatNumber(data.ga4.sessions),
      change: formatChange(data.ga4.sessionsChange),
      platform: "GA4",
    });
    if (data.ga4.conversions > 0) {
      entries.push({
        label: "Conversions",
        value: formatNumber(data.ga4.conversions),
        change: formatChange(data.ga4.conversionsChange),
        platform: "GA4",
      });
    }
  }

  if (data.metaAds) {
    entries.push({
      label: "Meta ROAS",
      value: `${data.metaAds.roas.toFixed(2)}x`,
      change: formatChange(data.metaAds.roasChange),
      platform: "Meta",
    });
    if (entries.length < 3) {
      entries.push({
        label: "Meta Spend",
        value: formatCurrency(data.metaAds.spend),
        change: formatChange(data.metaAds.spendChange),
        platform: "Meta",
      });
    }
  }

  if (data.linkedInAds) {
    entries.push({
      label: "LinkedIn Leads",
      value: formatNumber(data.linkedInAds.leads),
      change: formatChange(data.linkedInAds.leadsChange),
      platform: "LinkedIn",
    });
  }

  // Return top 3
  return entries.slice(0, 3);
}
