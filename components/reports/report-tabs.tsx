"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle } from "lucide-react";
import type { ReportCommentary, SectionCommentary } from "@/types/ai-commentary";
import type { UnifiedReportData } from "@/types/report-data";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatChange,
} from "@/lib/pdf/report-data-formatter";

type ReportStatus = "generating" | "ready" | "sent" | "failed";

interface ReportTabsProps {
  reportId: string;
  status: ReportStatus;
  pdfUrl: string | null;
  commentary: ReportCommentary | null;
  rawData: UnifiedReportData | null;
  clientId: string;
}

// ── Commentary section display ────────────────────────────────────────────────

function SectionCommentaryCard({
  title,
  data,
}: {
  title: string;
  data: SectionCommentary;
}) {
  const sentimentColor =
    data.sentiment === "positive"
      ? "text-green-700"
      : data.sentiment === "negative"
      ? "text-red-700"
      : "text-slate-600";

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className={`text-xs font-medium capitalize ${sentimentColor}`}>
          {data.sentiment}
        </span>
        {data.highlightMetric && (
          <span className="ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
            {data.highlightMetric}: {data.highlightValue}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{data.headline}</h3>
      <p className="text-sm text-slate-600 mb-3">{data.summary}</p>
      <div className="flex gap-6">
        <div>
          <div className="text-xs font-bold text-green-700 mb-1">Wins</div>
          {data.wins.map((w, i) => (
            <div key={i} className="text-xs text-green-600">
              ✓ {w}
            </div>
          ))}
        </div>
        {data.concerns.length > 0 && (
          <div>
            <div className="text-xs font-bold text-amber-700 mb-1">
              Watch
            </div>
            {data.concerns.map((c, i) => (
              <div key={i} className="text-xs text-amber-600">
                ⚠ {c}
              </div>
            ))}
          </div>
        )}
      </div>
      {data.recommendation && (
        <div className="mt-3 text-xs text-blue-700 italic border-t border-blue-100 pt-2">
          → {data.recommendation}
        </div>
      )}
    </div>
  );
}

// ── Raw Data display ──────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number;
}) {
  const cd = formatChange(change);
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{value}</span>
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            cd.isNeutral
              ? "bg-slate-100 text-slate-500"
              : cd.isPositive
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {cd.text}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportTabs({
  reportId,
  status,
  pdfUrl,
  commentary,
  rawData,
}: ReportTabsProps) {
  const router = useRouter();

  const poll = useCallback(async () => {
    try {
      const resp = await fetch(`/api/reports/${reportId}`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { status: ReportStatus };
      if (data.status !== "generating") {
        router.refresh();
      }
    } catch {
      // ignore
    }
  }, [reportId, router]);

  // Auto-refresh while generating
  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [status, poll]);

  return (
    <Tabs defaultValue="preview">
      <TabsList>
        <TabsTrigger value="preview">Report Preview</TabsTrigger>
        <TabsTrigger value="commentary">AI Commentary</TabsTrigger>
        <TabsTrigger value="raw">Raw Data</TabsTrigger>
      </TabsList>

      {/* ── Preview Tab ─────────────────────────────────────────────── */}
      <TabsContent value="preview" className="mt-4">
        {status === "generating" && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="text-lg font-medium">Generating your report…</p>
            <p className="text-sm mt-1">
              Fetching data, writing AI insights, and rendering PDF.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center justify-center py-24 text-red-500">
            <AlertTriangle className="h-10 w-10 mb-4" />
            <p className="text-lg font-medium">Generation Failed</p>
            <p className="text-sm text-slate-500 mt-1">
              Check your data connections and try again.
            </p>
          </div>
        )}

        {(status === "ready" || status === "sent") && pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Report PDF"
            className="w-full border rounded-lg"
            style={{ height: "800px" }}
          />
        ) : (
          (status === "ready" || status === "sent") && !pdfUrl && (
            <div className="text-center py-12 text-slate-500">
              PDF not yet available. Please refresh.
            </div>
          )
        )}
      </TabsContent>

      {/* ── Commentary Tab ──────────────────────────────────────────── */}
      <TabsContent value="commentary" className="mt-4">
        {!commentary ? (
          <div className="text-center py-12 text-slate-400">
            {status === "generating"
              ? "Commentary is being generated…"
              : "No commentary available."}
          </div>
        ) : (
          <div>
            {/* Executive Summary */}
            <div className="bg-slate-50 border rounded-lg p-4 mb-6">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                Executive Summary ·{" "}
                <span className="capitalize">
                  {commentary.executiveSummary.overallSentiment}
                </span>{" "}
                · {commentary.model} · {commentary.tokensUsed.toLocaleString()}{" "}
                tokens
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {commentary.executiveSummary.headline}
              </h2>
              <p className="text-sm text-slate-600">
                {commentary.executiveSummary.summary}
              </p>
              {commentary.executiveSummary.topWin && (
                <div className="mt-3 text-sm text-green-700 bg-green-50 rounded px-3 py-2">
                  ✓ {commentary.executiveSummary.topWin}
                </div>
              )}
              {commentary.executiveSummary.topConcern && (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
                  ⚠ {commentary.executiveSummary.topConcern}
                </div>
              )}
            </div>

            {commentary.ga4 && (
              <SectionCommentaryCard
                title="Google Analytics"
                data={commentary.ga4}
              />
            )}
            {commentary.metaAds && (
              <SectionCommentaryCard
                title="Meta Ads"
                data={commentary.metaAds}
              />
            )}
            {commentary.linkedInAds && (
              <SectionCommentaryCard
                title="LinkedIn Ads"
                data={commentary.linkedInAds}
              />
            )}
          </div>
        )}
      </TabsContent>

      {/* ── Raw Data Tab ────────────────────────────────────────────── */}
      <TabsContent value="raw" className="mt-4">
        {!rawData ? (
          <div className="text-center py-12 text-slate-400">
            {status === "generating" ? "Data is being fetched…" : "No data."}
          </div>
        ) : (
          <div className="space-y-6">
            {rawData.ga4 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Google Analytics (GA4)
                </h3>
                <div className="rounded-lg border p-4">
                  <MetricRow
                    label="Sessions"
                    value={formatNumber(rawData.ga4.sessions)}
                    change={rawData.ga4.sessionsChange}
                  />
                  <MetricRow
                    label="Users"
                    value={formatNumber(rawData.ga4.users)}
                    change={rawData.ga4.usersChange}
                  />
                  <MetricRow
                    label="New Users"
                    value={formatNumber(rawData.ga4.newUsers)}
                    change={rawData.ga4.newUsersChange}
                  />
                  <MetricRow
                    label="Bounce Rate"
                    value={formatPercentage(rawData.ga4.bounceRate)}
                    change={rawData.ga4.bounceRateChange}
                  />
                  <MetricRow
                    label="Conversions"
                    value={formatNumber(rawData.ga4.conversions)}
                    change={rawData.ga4.conversionsChange}
                  />
                </div>
              </div>
            )}

            {rawData.metaAds && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Meta Ads</h3>
                <div className="rounded-lg border p-4">
                  <MetricRow
                    label="Spend"
                    value={formatCurrency(rawData.metaAds.spend)}
                    change={rawData.metaAds.spendChange}
                  />
                  <MetricRow
                    label="ROAS"
                    value={`${rawData.metaAds.roas.toFixed(2)}x`}
                    change={rawData.metaAds.roasChange}
                  />
                  <MetricRow
                    label="CTR"
                    value={formatPercentage(rawData.metaAds.ctr, 2)}
                    change={rawData.metaAds.ctrChange}
                  />
                  <MetricRow
                    label="Conversions"
                    value={formatNumber(rawData.metaAds.conversions)}
                    change={rawData.metaAds.conversionsChange}
                  />
                </div>
              </div>
            )}

            {rawData.linkedInAds && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  LinkedIn Ads
                </h3>
                <div className="rounded-lg border p-4">
                  <MetricRow
                    label="Spend"
                    value={formatCurrency(rawData.linkedInAds.spend)}
                    change={rawData.linkedInAds.spendChange}
                  />
                  <MetricRow
                    label="Leads"
                    value={formatNumber(rawData.linkedInAds.leads)}
                    change={rawData.linkedInAds.leadsChange}
                  />
                  <MetricRow
                    label="Cost Per Lead"
                    value={formatCurrency(rawData.linkedInAds.costPerLead)}
                    change={rawData.linkedInAds.costPerLeadChange}
                  />
                  <MetricRow
                    label="CTR"
                    value={formatPercentage(rawData.linkedInAds.ctr, 2)}
                    change={rawData.linkedInAds.ctrChange}
                  />
                </div>
              </div>
            )}

            {rawData.fetchErrors.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-700 mb-3">
                  Fetch Errors
                </h3>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                  {rawData.fetchErrors.map((e, i) => (
                    <div key={i} className="text-sm text-red-700">
                      <span className="font-medium capitalize">
                        {e.platform}
                      </span>
                      : {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
