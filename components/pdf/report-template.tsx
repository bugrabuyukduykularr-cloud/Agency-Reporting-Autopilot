import React from "react";
import type { UnifiedReportData } from "@/types/report-data";
import type { ReportCommentary } from "@/types/ai-commentary";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatChange,
  formatDuration,
  getTopMetricSummary,
  type ChangeDisplay,
} from "@/lib/pdf/report-data-formatter";
import { buildLineChartSVG, buildBarChartSVG } from "@/lib/pdf/chart-helpers";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ReportTemplateProps {
  reportData: UnifiedReportData;
  commentary: ReportCommentary;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  agencySecondaryColor: string;
  agencyEmail: string;
  clientName: string;
  clientLogoUrl: string | null;
  periodLabel: string;
  generatedAt: string;
  reportId: string;
}

// ── Style constants ───────────────────────────────────────────────────────────

const BODY_FONT = "Arial, Helvetica, sans-serif";
const HEADING_FONT = "Georgia, \"Times New Roman\", serif";
const NAVY = "#0f172a";
const GRAY = "#64748b";
const LIGHT_GRAY = "#f8fafc";
const BORDER_GRAY = "#e2e8f0";

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionHeader({
  title,
  color,
}: {
  title: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "#fff",
        padding: "10px 24px",
        fontFamily: HEADING_FONT,
        fontSize: "16px",
        fontWeight: "bold",
        marginBottom: "20px",
        pageBreakBefore: "always",
      }}
    >
      {title}
    </div>
  );
}

function MetricBox({
  label,
  value,
  change,
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  change: ChangeDisplay;
  lowerIsBetter?: boolean;
}) {
  const effectivePositive = lowerIsBetter ? !change.isPositive : change.isPositive;
  const badgeColor = change.isNeutral
    ? "#94a3b8"
    : effectivePositive
    ? "#16a34a"
    : "#dc2626";

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: LIGHT_GRAY,
        border: `1px solid ${BORDER_GRAY}`,
        borderRadius: "6px",
        padding: "14px 16px",
        marginRight: "12px",
      }}
    >
      <div
        style={{
          fontFamily: BODY_FONT,
          fontSize: "11px",
          color: GRAY,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: HEADING_FONT,
          fontSize: "22px",
          fontWeight: "bold",
          color: NAVY,
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "inline-block",
          backgroundColor: change.isNeutral
            ? "#f1f5f9"
            : effectivePositive
            ? "#dcfce7"
            : "#fee2e2",
          color: badgeColor,
          fontSize: "11px",
          fontFamily: BODY_FONT,
          fontWeight: "bold",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {change.text}
      </div>
    </div>
  );
}

function CommentaryBox({
  headline,
  summary,
  wins,
  concerns,
  recommendation,
}: {
  headline: string;
  summary: string;
  wins: string[];
  concerns: string[];
  recommendation: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#dbeafe",
        borderLeft: "4px solid #3b82f6",
        borderRadius: "4px",
        padding: "16px 20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          fontFamily: HEADING_FONT,
          fontSize: "14px",
          fontWeight: "bold",
          color: NAVY,
          marginBottom: "8px",
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontFamily: BODY_FONT,
          fontSize: "12px",
          color: "#1e3a5f",
          lineHeight: "1.6",
          marginBottom: "12px",
        }}
      >
        {summary}
      </div>
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: 1 }}>
          {wins.map((w, i) => (
            <div
              key={i}
              style={{
                fontFamily: BODY_FONT,
                fontSize: "11px",
                color: "#15803d",
                marginBottom: "4px",
              }}
            >
              ✓ {w}
            </div>
          ))}
        </div>
        {concerns.length > 0 && (
          <div style={{ flex: 1 }}>
            {concerns.map((c, i) => (
              <div
                key={i}
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "11px",
                  color: "#b45309",
                  marginBottom: "4px",
                }}
              >
                ⚠ {c}
              </div>
            ))}
          </div>
        )}
      </div>
      {recommendation && (
        <div
          style={{
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: "#1e40af",
            fontStyle: "italic",
            marginTop: "10px",
            borderTop: "1px solid #93c5fd",
            paddingTop: "8px",
          }}
        >
          → {recommendation}
        </div>
      )}
    </div>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "#f1f5f9",
        borderBottom: `2px solid ${BORDER_GRAY}`,
        padding: "8px 12px",
      }}
    >
      {columns.map((col, i) => (
        <div
          key={i}
          style={{
            flex: i === 0 ? 2 : 1,
            fontFamily: BODY_FONT,
            fontSize: "10px",
            fontWeight: "bold",
            color: GRAY,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {col}
        </div>
      ))}
    </div>
  );
}

function TableRow({
  cells,
  isEven,
}: {
  cells: string[];
  isEven: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: isEven ? "#f8fafc" : "#fff",
        padding: "7px 12px",
        borderBottom: `1px solid ${BORDER_GRAY}`,
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          style={{
            flex: i === 0 ? 2 : 1,
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: NAVY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

// ── GA4 Section ───────────────────────────────────────────────────────────────

function GA4Section({
  data,
  commentary,
  periodLabel,
  primaryColor,
}: {
  data: NonNullable<UnifiedReportData["ga4"]>;
  commentary: NonNullable<ReportCommentary["ga4"]>;
  periodLabel: string;
  primaryColor: string;
}) {
  const chartSvg = buildLineChartSVG(data.sessionsChart, 440, 200, primaryColor);

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionHeader
        title={`Website Performance — ${periodLabel}`}
        color={primaryColor}
      />

      {/* Metric boxes */}
      <div style={{ display: "flex", padding: "0 24px", marginBottom: "20px" }}>
        <MetricBox
          label="Sessions"
          value={formatNumber(data.sessions)}
          change={formatChange(data.sessionsChange)}
        />
        <MetricBox
          label="Users"
          value={formatNumber(data.users)}
          change={formatChange(data.usersChange)}
        />
        <MetricBox
          label="Bounce Rate"
          value={formatPercentage(data.bounceRate)}
          change={formatChange(data.bounceRateChange)}
          lowerIsBetter
        />
        <MetricBox
          label="Conversions"
          value={formatNumber(data.conversions)}
          change={formatChange(data.conversionsChange)}
        />
      </div>

      {/* Chart + Sources */}
      <div
        style={{
          display: "flex",
          padding: "0 24px",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: "0 0 440px" }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Daily Sessions
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: chartSvg }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Top Traffic Sources
          </div>
          <TableHeader columns={["Source / Medium", "Sessions", "%"]} />
          {data.topSources.slice(0, 5).map((s, i) => (
            <TableRow
              key={i}
              isEven={i % 2 === 0}
              cells={[
                `${s.source} / ${s.medium}`,
                formatNumber(s.sessions),
                formatPercentage(s.percentage),
              ]}
            />
          ))}
        </div>
      </div>

      {/* Commentary */}
      <div style={{ padding: "0 24px", marginBottom: "20px" }}>
        <CommentaryBox
          headline={commentary.headline}
          summary={commentary.summary}
          wins={commentary.wins}
          concerns={commentary.concerns}
          recommendation={commentary.recommendation}
        />
      </div>

      {/* Top Pages */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: GRAY,
            marginBottom: "8px",
            fontWeight: "bold",
          }}
        >
          Top Pages
        </div>
        <TableHeader columns={["Page", "Views", "Avg Time"]} />
        {data.topPages.slice(0, 5).map((p, i) => (
          <TableRow
            key={i}
            isEven={i % 2 === 0}
            cells={[
              p.pagePath,
              formatNumber(p.pageViews),
              formatDuration(p.avgDuration),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

// ── Meta Ads Section ──────────────────────────────────────────────────────────

function MetaAdsSection({
  data,
  commentary,
  periodLabel,
  primaryColor,
}: {
  data: NonNullable<UnifiedReportData["metaAds"]>;
  commentary: NonNullable<ReportCommentary["metaAds"]>;
  periodLabel: string;
  primaryColor: string;
}) {
  const chartSvg = buildBarChartSVG(data.spendChart, 440, 200, primaryColor);

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionHeader
        title={`Meta Ads Performance — ${periodLabel}`}
        color={primaryColor}
      />

      {/* Metric boxes */}
      <div style={{ display: "flex", padding: "0 24px", marginBottom: "20px" }}>
        <MetricBox
          label="Spend"
          value={formatCurrency(data.spend)}
          change={formatChange(data.spendChange)}
        />
        <MetricBox
          label="ROAS"
          value={`${data.roas.toFixed(2)}x`}
          change={formatChange(data.roasChange)}
        />
        <MetricBox
          label="CTR"
          value={formatPercentage(data.ctr, 2)}
          change={formatChange(data.ctrChange)}
        />
        <MetricBox
          label="Conversions"
          value={formatNumber(data.conversions)}
          change={formatChange(data.conversionsChange)}
        />
      </div>

      {/* Chart + Key Metrics */}
      <div
        style={{
          display: "flex",
          padding: "0 24px",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: "0 0 440px" }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Daily Spend
          </div>
          <div dangerouslySetInnerHTML={{ __html: chartSvg }} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Key Metrics
          </div>
          {[
            ["Impressions", formatNumber(data.impressions)],
            ["Reach", formatNumber(data.reach)],
            ["Frequency", `${data.frequency.toFixed(2)}x`],
            ["CPC", formatCurrency(data.cpc)],
            ["CPM", formatCurrency(data.cpm)],
            ["Cost/Conv.", formatCurrency(data.costPerConversion)],
          ].map(([label, val], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${BORDER_GRAY}`,
              }}
            >
              <span
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "11px",
                  color: GRAY,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "11px",
                  color: NAVY,
                  fontWeight: "bold",
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Commentary */}
      <div style={{ padding: "0 24px", marginBottom: "20px" }}>
        <CommentaryBox
          headline={commentary.headline}
          summary={commentary.summary}
          wins={commentary.wins}
          concerns={commentary.concerns}
          recommendation={commentary.recommendation}
        />
      </div>

      {/* Campaign Table */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: GRAY,
            marginBottom: "8px",
            fontWeight: "bold",
          }}
        >
          Campaign Breakdown
        </div>
        <TableHeader
          columns={["Campaign", "Spend", "ROAS", "CTR", "Conv."]}
        />
        {data.campaigns.slice(0, 5).map((c, i) => (
          <TableRow
            key={i}
            isEven={i % 2 === 0}
            cells={[
              c.name,
              formatCurrency(c.spend),
              `${c.roas.toFixed(2)}x`,
              formatPercentage(c.ctr, 2),
              String(c.conversions),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

// ── LinkedIn Ads Section ──────────────────────────────────────────────────────

function LinkedInSection({
  data,
  commentary,
  periodLabel,
  primaryColor,
}: {
  data: NonNullable<UnifiedReportData["linkedInAds"]>;
  commentary: NonNullable<ReportCommentary["linkedInAds"]>;
  periodLabel: string;
  primaryColor: string;
}) {
  const chartSvg = buildBarChartSVG(data.spendChart, 440, 200, primaryColor);

  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionHeader
        title={`LinkedIn Ads — ${periodLabel}`}
        color={primaryColor}
      />

      {/* Metric boxes */}
      <div style={{ display: "flex", padding: "0 24px", marginBottom: "20px" }}>
        <MetricBox
          label="Spend"
          value={formatCurrency(data.spend)}
          change={formatChange(data.spendChange)}
        />
        <MetricBox
          label="Leads"
          value={formatNumber(data.leads)}
          change={formatChange(data.leadsChange)}
        />
        <MetricBox
          label="CTR"
          value={formatPercentage(data.ctr, 2)}
          change={formatChange(data.ctrChange)}
        />
        <MetricBox
          label="Cost / Lead"
          value={formatCurrency(data.costPerLead)}
          change={formatChange(data.costPerLeadChange)}
          lowerIsBetter
        />
      </div>

      {/* Chart + Key Metrics */}
      <div
        style={{
          display: "flex",
          padding: "0 24px",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: "0 0 440px" }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Daily Spend
          </div>
          <div dangerouslySetInnerHTML={{ __html: chartSvg }} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "11px",
              color: GRAY,
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Key Metrics
          </div>
          {[
            ["Impressions", formatNumber(data.impressions)],
            ["Clicks", formatNumber(data.clicks)],
            ["CPC", formatCurrency(data.cpc)],
            ["CPM", formatCurrency(data.cpm)],
          ].map(([label, val], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${BORDER_GRAY}`,
              }}
            >
              <span
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "11px",
                  color: GRAY,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "11px",
                  color: NAVY,
                  fontWeight: "bold",
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Commentary */}
      <div style={{ padding: "0 24px", marginBottom: "20px" }}>
        <CommentaryBox
          headline={commentary.headline}
          summary={commentary.summary}
          wins={commentary.wins}
          concerns={commentary.concerns}
          recommendation={commentary.recommendation}
        />
      </div>

      {/* Campaign Table */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: GRAY,
            marginBottom: "8px",
            fontWeight: "bold",
          }}
        >
          Campaign Breakdown
        </div>
        <TableHeader columns={["Campaign", "Spend", "Leads", "CTR"]} />
        {data.campaigns.slice(0, 5).map((c, i) => (
          <TableRow
            key={i}
            isEven={i % 2 === 0}
            cells={[
              c.name,
              formatCurrency(c.spend),
              String(c.leads),
              formatPercentage(c.ctr, 2),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Template ─────────────────────────────────────────────────────────────

export function ReportTemplate({
  reportData,
  commentary,
  agencyName,
  agencyLogoUrl,
  agencyPrimaryColor,
  agencyEmail,
  clientName,
  clientLogoUrl,
  periodLabel,
  generatedAt,
}: ReportTemplateProps) {
  const topMetrics = getTopMetricSummary(reportData);
  const exec = commentary.executiveSummary;

  // Format generated date
  const genDate = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Next report placeholder (30 days out)
  const nextReport = new Date(generatedAt);
  nextReport.setDate(nextReport.getDate() + 30);
  const nextReportLabel = nextReport.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        width: "794px",
        backgroundColor: "#fff",
        fontFamily: BODY_FONT,
        color: NAVY,
      }}
    >
      {/* ── PAGE 1: COVER ─────────────────────────────────────────────── */}
      <div
        style={{
          minHeight: "1123px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            backgroundColor: agencyPrimaryColor,
            height: "40px",
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "32px 48px 0",
          }}
        >
          {/* Agency logo */}
          <div>
            {agencyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agencyLogoUrl}
                alt={agencyName}
                style={{ maxWidth: "120px", maxHeight: "60px", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  fontFamily: HEADING_FONT,
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: agencyPrimaryColor,
                }}
              >
                {agencyName}
              </div>
            )}
          </div>
          {/* Client logo */}
          <div>
            {clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clientLogoUrl}
                alt={clientName}
                style={{ maxWidth: "80px", maxHeight: "50px", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "14px",
                  color: GRAY,
                }}
              >
                {clientName}
              </div>
            )}
          </div>
        </div>

        {/* Center content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 48px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: HEADING_FONT,
              fontSize: "32px",
              fontWeight: "bold",
              color: NAVY,
              marginBottom: "16px",
            }}
          >
            Marketing Performance Report
          </div>
          <div
            style={{
              fontFamily: HEADING_FONT,
              fontSize: "26px",
              fontWeight: "bold",
              color: agencyPrimaryColor,
              marginBottom: "12px",
            }}
          >
            {clientName}
          </div>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "18px",
              color: GRAY,
              marginBottom: "8px",
            }}
          >
            {periodLabel}
          </div>
          <div
            style={{ fontFamily: BODY_FONT, fontSize: "13px", color: "#94a3b8" }}
          >
            Generated {genDate}
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: "240px",
              height: "3px",
              backgroundColor: agencyPrimaryColor,
              marginTop: "32px",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "24px 48px",
            textAlign: "center",
            fontFamily: BODY_FONT,
            fontSize: "12px",
            color: "#94a3b8",
          }}
        >
          Prepared by {agencyName}
        </div>
      </div>

      {/* ── PAGE 2: EXECUTIVE SUMMARY ─────────────────────────────────── */}
      <div style={{ pageBreakBefore: "always", paddingBottom: "32px" }}>
        <div
          style={{
            backgroundColor: agencyPrimaryColor,
            color: "#fff",
            padding: "10px 24px",
            fontFamily: HEADING_FONT,
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "24px",
          }}
        >
          Executive Summary
        </div>

        <div style={{ padding: "0 24px" }}>
          {/* Headline */}
          <div
            style={{
              fontFamily: HEADING_FONT,
              fontSize: "20px",
              fontWeight: "bold",
              color: NAVY,
              marginBottom: "12px",
            }}
          >
            {exec.headline}
          </div>

          {/* Summary */}
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "13px",
              color: "#334155",
              lineHeight: "1.7",
              marginBottom: "24px",
            }}
          >
            {exec.summary}
          </div>

          {/* Metric callout boxes */}
          {topMetrics.length > 0 && (
            <div
              style={{ display: "flex", gap: "0", marginBottom: "24px" }}
            >
              {topMetrics.map((m, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: LIGHT_GRAY,
                    border: `1px solid ${BORDER_GRAY}`,
                    borderRadius: "6px",
                    padding: "14px 16px",
                    marginRight: i < topMetrics.length - 1 ? "12px" : "0",
                  }}
                >
                  <div
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "10px",
                      color: agencyPrimaryColor,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    {m.platform}
                  </div>
                  <div
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "11px",
                      color: GRAY,
                      marginBottom: "6px",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontFamily: HEADING_FONT,
                      fontSize: "22px",
                      fontWeight: "bold",
                      color: NAVY,
                      marginBottom: "4px",
                    }}
                  >
                    {m.value}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      backgroundColor: m.change.isNeutral
                        ? "#f1f5f9"
                        : m.change.isPositive
                        ? "#dcfce7"
                        : "#fee2e2",
                      color: m.change.isNeutral
                        ? "#94a3b8"
                        : m.change.isPositive
                        ? "#16a34a"
                        : "#dc2626",
                      fontSize: "11px",
                      fontFamily: BODY_FONT,
                      fontWeight: "bold",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {m.change.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top win */}
          {exec.topWin && (
            <div
              style={{
                backgroundColor: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "6px",
                padding: "12px 16px",
                marginBottom: "12px",
                fontFamily: BODY_FONT,
                fontSize: "13px",
                color: "#15803d",
              }}
            >
              ✓ Top Win: {exec.topWin}
            </div>
          )}

          {/* Top concern */}
          {exec.topConcern && (
            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: "6px",
                padding: "12px 16px",
                fontFamily: BODY_FONT,
                fontSize: "13px",
                color: "#92400e",
              }}
            >
              ⚠ To Watch: {exec.topConcern}
            </div>
          )}
        </div>
      </div>

      {/* ── PLATFORM SECTIONS ─────────────────────────────────────────── */}

      {reportData.ga4 && commentary.ga4 && (
        <GA4Section
          data={reportData.ga4}
          commentary={commentary.ga4}
          periodLabel={periodLabel}
          primaryColor={agencyPrimaryColor}
        />
      )}

      {reportData.metaAds && commentary.metaAds && (
        <MetaAdsSection
          data={reportData.metaAds}
          commentary={commentary.metaAds}
          periodLabel={periodLabel}
          primaryColor={agencyPrimaryColor}
        />
      )}

      {reportData.linkedInAds && commentary.linkedInAds && (
        <LinkedInSection
          data={reportData.linkedInAds}
          commentary={commentary.linkedInAds}
          periodLabel={periodLabel}
          primaryColor={agencyPrimaryColor}
        />
      )}

      {/* ── RECOMMENDATIONS PAGE ──────────────────────────────────────── */}
      <div style={{ pageBreakBefore: "always", paddingBottom: "48px" }}>
        <div
          style={{
            backgroundColor: agencyPrimaryColor,
            color: "#fff",
            padding: "10px 24px",
            fontFamily: HEADING_FONT,
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "24px",
          }}
        >
          Recommendations &amp; Next Steps
        </div>

        <div style={{ padding: "0 24px" }}>
          {[
            commentary.ga4 && {
              platform: "Website (GA4)",
              rec: commentary.ga4.recommendation,
              color: "#3b82f6",
            },
            commentary.metaAds && {
              platform: "Meta Ads",
              rec: commentary.metaAds.recommendation,
              color: "#1877f2",
            },
            commentary.linkedInAds && {
              platform: "LinkedIn Ads",
              rec: commentary.linkedInAds.recommendation,
              color: "#0a66c2",
            },
          ]
            .filter(Boolean)
            .map((item, i) => {
              const { platform, rec, color } = item as {
                platform: string;
                rec: string;
                color: string;
              };
              return (
                <div
                  key={i}
                  style={{
                    borderLeft: `4px solid ${color}`,
                    backgroundColor: LIGHT_GRAY,
                    borderRadius: "4px",
                    padding: "16px 20px",
                    marginBottom: "16px",
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontFamily: HEADING_FONT,
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: color,
                      minWidth: "28px",
                    }}
                  >
                    {i + 1}.
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: BODY_FONT,
                        fontSize: "11px",
                        color,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      {platform}
                    </div>
                    <div
                      style={{
                        fontFamily: BODY_FONT,
                        fontSize: "13px",
                        color: NAVY,
                        lineHeight: "1.6",
                      }}
                    >
                      {rec}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div
          style={{
            margin: "48px 24px 0",
            paddingTop: "16px",
            borderTop: `1px solid ${BORDER_GRAY}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "12px",
                  color: NAVY,
                  fontWeight: "bold",
                }}
              >
                Report generated by {agencyName}
              </div>
              <div
                style={{ fontFamily: BODY_FONT, fontSize: "11px", color: GRAY }}
              >
                {agencyEmail}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ fontFamily: BODY_FONT, fontSize: "11px", color: GRAY }}
              >
                Next report: {nextReportLabel}
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: "10px",
              color: "#94a3b8",
              marginTop: "8px",
            }}
          >
            This report was automatically generated by Agency Reporting Autopilot
          </div>
        </div>
      </div>
    </div>
  );
}
