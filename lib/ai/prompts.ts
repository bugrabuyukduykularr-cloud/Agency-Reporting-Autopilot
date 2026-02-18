import type { AITone, SectionCommentary, CommentaryRequest } from "@/types/ai-commentary";
import type { GA4Data, MetaAdsData, LinkedInAdsData } from "@/types/report-data";

// ── Tone Instructions ─────────────────────────────────────────────────────────

export const TONE_INSTRUCTIONS: Record<AITone, string> = {
  professional: `Use formal, precise language. Lead with data.
    Avoid casual expressions. Suitable for corporate clients.
    Use terms like "performance metrics indicate" and "we recommend".`,

  friendly: `Use warm, conversational language. Celebrate wins enthusiastically.
    Frame challenges constructively. Use "you" and "your team".
    Suitable for small business clients who want encouragement.`,

  "data-heavy": `Maximize numerical detail. Include specific percentages,
    ratios and comparisons in every sentence. Use technical marketing terms
    freely. Suitable for analytics-savvy clients who want granularity.`,
};

// ── System Prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(tone: AITone): string {
  return `You are an expert marketing analyst writing a performance report \
section for a client. Your writing style: ${TONE_INSTRUCTIONS[tone]}

Rules:
- Always lead with the most important insight
- Explain WHY metrics changed, not just that they changed
- Use specific numbers from the data provided
- Keep headline under 12 words
- Keep summary to 2-3 sentences maximum
- List 2-3 wins and 0-2 concerns as short phrases (under 15 words each)
- Recommendation must be one specific actionable sentence
- Never use jargon the client won't understand (unless data-heavy tone)
- Never make up data not provided
- Respond ONLY with valid JSON. No markdown. No explanation. No backticks.`;
}

// ── GA4 Prompt ────────────────────────────────────────────────────────────────

export function buildGA4Prompt(
  data: GA4Data,
  request: CommentaryRequest
): string {
  const sign = (n: number) => (n > 0 ? "+" : "");
  return `Generate commentary for a Google Analytics report section.

Client: ${request.clientName}
Period: ${request.periodLabel}

CURRENT PERIOD METRICS:
- Sessions: ${data.sessions.toLocaleString()} (${sign(data.sessionsChange)}${data.sessionsChange}% vs last period)
- Users: ${data.users.toLocaleString()} (${sign(data.usersChange)}${data.usersChange}%)
- New Users: ${data.newUsers.toLocaleString()} (${sign(data.newUsersChange)}${data.newUsersChange}%)
- Page Views: ${data.pageViews.toLocaleString()} (${sign(data.pageViewsChange)}${data.pageViewsChange}%)
- Bounce Rate: ${data.bounceRate.toFixed(1)}% (${sign(data.bounceRateChange)}${data.bounceRateChange}% vs last period)
- Avg Session Duration: ${Math.floor(data.avgSessionDuration / 60)}m ${Math.floor(data.avgSessionDuration % 60)}s
- Conversions: ${data.conversions.toLocaleString()} (${sign(data.conversionsChange)}${data.conversionsChange}%)

TOP TRAFFIC SOURCES:
${data.topSources
  .map(
    (s) =>
      `- ${s.source} / ${s.medium}: ${s.sessions.toLocaleString()} sessions (${s.percentage.toFixed(1)}%)`
  )
  .join("\n")}

TOP PAGES:
${data.topPages
  .map((p) => `- ${p.pagePath}: ${p.pageViews.toLocaleString()} views`)
  .join("\n")}

DEVICE SPLIT:
${data.deviceBreakdown
  .map((d) => `- ${d.device}: ${d.percentage.toFixed(1)}%`)
  .join("\n")}

Respond with this exact JSON schema:
{
  "headline": "string",
  "summary": "string",
  "wins": ["string", "string"],
  "concerns": ["string"],
  "recommendation": "string",
  "sentiment": "positive|neutral|negative",
  "highlightMetric": "string",
  "highlightValue": "string"
}`;
}

// ── Meta Ads Prompt ───────────────────────────────────────────────────────────

export function buildMetaAdsPrompt(
  data: MetaAdsData,
  request: CommentaryRequest
): string {
  const sign = (n: number) => (n > 0 ? "+" : "");
  return `Generate commentary for a Meta Ads performance section.

Client: ${request.clientName}
Period: ${request.periodLabel}

CURRENT PERIOD METRICS:
- Total Spend: $${data.spend.toFixed(2)} (${sign(data.spendChange)}${data.spendChange}% vs last period)
- Impressions: ${data.impressions.toLocaleString()} (${sign(data.impressionsChange)}${data.impressionsChange}%)
- Reach: ${data.reach.toLocaleString()} | Frequency: ${data.frequency.toFixed(2)}x
- Clicks: ${data.clicks.toLocaleString()} | CTR: ${data.ctr.toFixed(2)}% (${sign(data.ctrChange)}${data.ctrChange}%)
- CPC: $${data.cpc.toFixed(2)} (${sign(data.cpcChange)}${data.cpcChange}%)
- CPM: $${data.cpm.toFixed(2)} (${sign(data.cpmChange)}${data.cpmChange}%)
- Conversions: ${data.conversions.toLocaleString()} (${sign(data.conversionsChange)}${data.conversionsChange}%)
- Cost Per Conversion: $${data.costPerConversion.toFixed(2)}
- ROAS: ${data.roas.toFixed(2)}x (${sign(data.roasChange)}${data.roasChange}%)

TOP CAMPAIGNS:
${data.campaigns
  .map(
    (c) =>
      `- ${c.name}: $${c.spend.toFixed(2)} spend, ${c.roas.toFixed(2)}x ROAS, ${c.conversions} conversions`
  )
  .join("\n")}

Respond with this exact JSON schema:
{
  "headline": "string",
  "summary": "string",
  "wins": ["string", "string"],
  "concerns": ["string"],
  "recommendation": "string",
  "sentiment": "positive|neutral|negative",
  "highlightMetric": "string",
  "highlightValue": "string"
}`;
}

// ── LinkedIn Ads Prompt ───────────────────────────────────────────────────────

export function buildLinkedInAdsPrompt(
  data: LinkedInAdsData,
  request: CommentaryRequest
): string {
  const sign = (n: number) => (n > 0 ? "+" : "");
  return `Generate commentary for a LinkedIn Ads performance section.

Client: ${request.clientName}
Period: ${request.periodLabel}

CURRENT PERIOD METRICS:
- Total Spend: $${data.spend.toFixed(2)} (${sign(data.spendChange)}${data.spendChange}% vs last period)
- Impressions: ${data.impressions.toLocaleString()} (${sign(data.impressionsChange)}${data.impressionsChange}%)
- Clicks: ${data.clicks.toLocaleString()} | CTR: ${data.ctr.toFixed(2)}%
- CPC: $${data.cpc.toFixed(2)} | CPM: $${data.cpm.toFixed(2)}
- Leads: ${data.leads.toLocaleString()} (${sign(data.leadsChange)}${data.leadsChange}%)
- Cost Per Lead: $${data.costPerLead.toFixed(2)} (${sign(data.costPerLeadChange)}${data.costPerLeadChange}%)

TOP CAMPAIGNS:
${data.campaigns
  .map(
    (c) =>
      `- ${c.name}: $${c.spend.toFixed(2)} spend, ${c.leads} leads, ${c.ctr.toFixed(2)}% CTR`
  )
  .join("\n")}

Respond with this exact JSON schema:
{
  "headline": "string",
  "summary": "string",
  "wins": ["string", "string"],
  "concerns": ["string"],
  "recommendation": "string",
  "sentiment": "positive|neutral|negative",
  "highlightMetric": "string",
  "highlightValue": "string"
}`;
}

// ── Executive Summary Prompt ──────────────────────────────────────────────────

export function buildExecutiveSummaryPrompt(
  request: CommentaryRequest,
  sectionCommentaries: {
    ga4?: SectionCommentary | null;
    metaAds?: SectionCommentary | null;
    linkedInAds?: SectionCommentary | null;
  }
): string {
  const sections: string[] = [];

  if (sectionCommentaries.ga4) {
    sections.push(`WEBSITE (GA4): ${sectionCommentaries.ga4.summary}
      Top win: ${sectionCommentaries.ga4.wins[0] ?? "N/A"}
      Sentiment: ${sectionCommentaries.ga4.sentiment}`);
  }
  if (sectionCommentaries.metaAds) {
    sections.push(`META ADS: ${sectionCommentaries.metaAds.summary}
      Top win: ${sectionCommentaries.metaAds.wins[0] ?? "N/A"}
      Sentiment: ${sectionCommentaries.metaAds.sentiment}`);
  }
  if (sectionCommentaries.linkedInAds) {
    sections.push(`LINKEDIN ADS: ${sectionCommentaries.linkedInAds.summary}
      Top win: ${sectionCommentaries.linkedInAds.wins[0] ?? "N/A"}
      Sentiment: ${sectionCommentaries.linkedInAds.sentiment}`);
  }

  return `Write an executive summary for a marketing performance report.

Client: ${request.clientName}
Period: ${request.periodLabel}

SECTION SUMMARIES:
${sections.join("\n\n")}

Respond with this exact JSON schema:
{
  "headline": "string (overall report headline, max 12 words)",
  "summary": "string (3-4 sentences covering all platforms)",
  "topWin": "string (single best result phrase, under 20 words)",
  "topConcern": "string (biggest issue or empty string if all positive)",
  "overallSentiment": "positive|neutral|negative"
}`;
}
