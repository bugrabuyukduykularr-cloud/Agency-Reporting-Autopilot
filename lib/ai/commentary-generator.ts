import OpenAI from "openai";
import {
  buildSystemPrompt,
  buildGA4Prompt,
  buildMetaAdsPrompt,
  buildLinkedInAdsPrompt,
  buildExecutiveSummaryPrompt,
} from "./prompts";
import type {
  CommentaryRequest,
  ReportCommentary,
  SectionCommentary,
} from "@/types/ai-commentary";

// Lazy-initialized to avoid crashing at build time when OPENAI_API_KEY is absent
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}
function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

// ── OpenAI call with exponential backoff ──────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  retries = 3
): Promise<{ content: string; tokensUsed: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: getModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      const tokensUsed = response.usage?.total_tokens ?? 0;
      console.log(`[OpenAI] ${getModel()} — ${tokensUsed} tokens used`);
      return { content, tokensUsed };
    } catch (err) {
      const isRateLimit =
        err instanceof OpenAI.APIError && err.status === 429;

      if (attempt < retries) {
        const waitMs = isRateLimit ? (attempt + 1) * 2000 : 1000;
        console.warn(
          `[OpenAI] attempt ${attempt + 1} failed — retrying in ${waitMs}ms`
        );
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  // unreachable — loop always throws or returns
  throw new Error("OpenAI retries exhausted");
}

// ── Parse + validate SectionCommentary ───────────────────────────────────────

function parseCommentary(raw: string, platform: string): SectionCommentary {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const headline =
      typeof parsed.headline === "string" ? parsed.headline : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const wins = Array.isArray(parsed.wins)
      ? (parsed.wins as string[]).filter((w) => typeof w === "string")
      : [];
    const concerns = Array.isArray(parsed.concerns)
      ? (parsed.concerns as string[]).filter((c) => typeof c === "string")
      : [];
    const recommendation =
      typeof parsed.recommendation === "string" ? parsed.recommendation : "";
    const rawSentiment = parsed.sentiment;
    const sentiment: SectionCommentary["sentiment"] =
      rawSentiment === "positive" ||
      rawSentiment === "neutral" ||
      rawSentiment === "negative"
        ? rawSentiment
        : "neutral";
    const highlightMetric =
      typeof parsed.highlightMetric === "string" ? parsed.highlightMetric : "";
    const highlightValue =
      typeof parsed.highlightValue === "string" ? parsed.highlightValue : "";

    if (!headline || !summary || wins.length === 0) {
      throw new Error("Required fields missing");
    }

    return {
      headline,
      summary,
      wins,
      concerns,
      recommendation,
      sentiment,
      highlightMetric,
      highlightValue,
    };
  } catch (err) {
    console.error(`[parseCommentary] Failed to parse ${platform}:`, err);
    return buildFallbackCommentary(platform);
  }
}

// ── Fallback commentary ───────────────────────────────────────────────────────

function buildFallbackCommentary(platform: string): SectionCommentary {
  return {
    headline: "Performance data available for this period",
    summary: `Your ${platform} data has been collected for this period. Detailed AI analysis was temporarily unavailable.`,
    wins: ["Data successfully collected for the period"],
    concerns: [],
    recommendation: "Review the metrics above for performance details.",
    sentiment: "neutral",
    highlightMetric: "data",
    highlightValue: "Available",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateReportCommentary(
  request: CommentaryRequest
): Promise<ReportCommentary> {
  const systemPrompt = buildSystemPrompt(request.tone);
  let totalTokens = 0;

  // STEP 1 — Generate section commentaries in parallel
  const [ga4Result, metaResult, linkedInResult] = await Promise.allSettled([
    request.ga4Data
      ? callOpenAI(systemPrompt, buildGA4Prompt(request.ga4Data, request))
      : Promise.resolve(null),
    request.metaAdsData
      ? callOpenAI(systemPrompt, buildMetaAdsPrompt(request.metaAdsData, request))
      : Promise.resolve(null),
    request.linkedInAdsData
      ? callOpenAI(
          systemPrompt,
          buildLinkedInAdsPrompt(request.linkedInAdsData, request)
        )
      : Promise.resolve(null),
  ]);

  // STEP 2 — Parse results
  let ga4Commentary: SectionCommentary | null = null;
  let metaCommentary: SectionCommentary | null = null;
  let linkedInCommentary: SectionCommentary | null = null;

  if (ga4Result.status === "fulfilled" && ga4Result.value !== null) {
    totalTokens += ga4Result.value.tokensUsed;
    ga4Commentary = parseCommentary(ga4Result.value.content, "Google Analytics");
  } else if (ga4Result.status === "rejected") {
    console.error("[commentary] GA4 failed:", ga4Result.reason);
    if (request.ga4Data) ga4Commentary = buildFallbackCommentary("Google Analytics");
  }

  if (metaResult.status === "fulfilled" && metaResult.value !== null) {
    totalTokens += metaResult.value.tokensUsed;
    metaCommentary = parseCommentary(metaResult.value.content, "Meta Ads");
  } else if (metaResult.status === "rejected") {
    console.error("[commentary] Meta failed:", metaResult.reason);
    if (request.metaAdsData) metaCommentary = buildFallbackCommentary("Meta Ads");
  }

  if (linkedInResult.status === "fulfilled" && linkedInResult.value !== null) {
    totalTokens += linkedInResult.value.tokensUsed;
    linkedInCommentary = parseCommentary(
      linkedInResult.value.content,
      "LinkedIn Ads"
    );
  } else if (linkedInResult.status === "rejected") {
    console.error("[commentary] LinkedIn failed:", linkedInResult.reason);
    if (request.linkedInAdsData)
      linkedInCommentary = buildFallbackCommentary("LinkedIn Ads");
  }

  // STEP 3 — Generate executive summary
  let executiveSummary: ReportCommentary["executiveSummary"] = {
    headline: `${request.clientName} — ${request.periodLabel} Performance`,
    summary:
      "Marketing performance data has been collected for this period. Please review the platform sections below for detailed insights.",
    topWin: "",
    topConcern: "",
    overallSentiment: "neutral",
  };

  try {
    const execResult = await callOpenAI(
      systemPrompt,
      buildExecutiveSummaryPrompt(request, {
        ga4: ga4Commentary,
        metaAds: metaCommentary,
        linkedInAds: linkedInCommentary,
      })
    );
    totalTokens += execResult.tokensUsed;

    const parsed = JSON.parse(execResult.content) as Record<string, unknown>;
    const rawSentiment = parsed.overallSentiment;
    executiveSummary = {
      headline:
        typeof parsed.headline === "string"
          ? parsed.headline
          : executiveSummary.headline,
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : executiveSummary.summary,
      topWin: typeof parsed.topWin === "string" ? parsed.topWin : "",
      topConcern:
        typeof parsed.topConcern === "string" ? parsed.topConcern : "",
      overallSentiment:
        rawSentiment === "positive" ||
        rawSentiment === "neutral" ||
        rawSentiment === "negative"
          ? rawSentiment
          : "neutral",
    };
  } catch (err) {
    console.error("[commentary] Executive summary failed:", err);
    // Keep the fallback defined above
  }

  console.log(
    `[commentary] Total tokens used: ${totalTokens}, model: ${getModel()}`
  );

  return {
    executiveSummary,
    ga4: ga4Commentary,
    metaAds: metaCommentary,
    linkedInAds: linkedInCommentary,
    generatedAt: new Date().toISOString(),
    model: getModel(),
    tokensUsed: totalTokens,
  };
}
