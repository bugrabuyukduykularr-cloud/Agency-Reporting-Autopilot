import type { GA4Data, MetaAdsData, LinkedInAdsData } from "./report-data";

// ── Section Commentary ────────────────────────────────────────────────────────
export interface SectionCommentary {
  headline: string;         // 8-12 word punchy summary
  summary: string;          // 2-3 sentence paragraph
  wins: string[];           // 2-3 positive highlights
  concerns: string[];       // 0-2 areas needing attention
  recommendation: string;   // one specific actionable next step
  sentiment: "positive" | "neutral" | "negative";
  highlightMetric: string;  // the single most important metric name
  highlightValue: string;   // the value of that metric (formatted)
}

// ── Full Report Commentary ────────────────────────────────────────────────────
export interface ReportCommentary {
  executiveSummary: {
    headline: string;       // overall report headline
    summary: string;        // 3-4 sentence overview of entire period
    topWin: string;         // single best result across all platforms
    topConcern: string;     // single biggest issue if any, else ''
    overallSentiment: "positive" | "neutral" | "negative";
  };
  ga4?: SectionCommentary | null;
  metaAds?: SectionCommentary | null;
  linkedInAds?: SectionCommentary | null;
  generatedAt: string;
  model: string;            // which GPT model was used
  tokensUsed: number;
}

// ── AI Tone ───────────────────────────────────────────────────────────────────
export type AITone = "professional" | "friendly" | "data-heavy";

// ── Commentary Request ────────────────────────────────────────────────────────
export interface CommentaryRequest {
  clientName: string;
  periodLabel: string;      // e.g. "January 2026"
  tone: AITone;
  ga4Data?: GA4Data | null;
  metaAdsData?: MetaAdsData | null;
  linkedInAdsData?: LinkedInAdsData | null;
}
