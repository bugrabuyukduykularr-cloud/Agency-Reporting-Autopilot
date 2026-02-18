import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportTabs } from "@/components/reports/report-tabs";
import { ExternalLink, Download, ChevronLeft } from "lucide-react";
import type { ReportCommentary } from "@/types/ai-commentary";
import type { UnifiedReportData } from "@/types/report-data";

type ReportStatus = "generating" | "ready" | "sent" | "failed";

function StatusBadge({ status }: { status: ReportStatus }) {
  const map: Record<
    ReportStatus,
    { label: string; className: string }
  > = {
    generating: {
      label: "Generating…",
      className: "border-blue-300 bg-blue-50 text-blue-700",
    },
    ready: {
      label: "Ready",
      className: "border-green-300 bg-green-50 text-green-700",
    },
    sent: {
      label: "Sent",
      className: "border-purple-300 bg-purple-50 text-purple-700",
    },
    failed: {
      label: "Failed",
      className: "border-red-300 bg-red-50 text-red-700",
    },
  };

  const { label, className } = map[status] ?? {
    label: status,
    className: "",
  };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: report } = await supabase
    .from("reports")
    .select(
      `id, client_id, agency_id, period_start, period_end,
       status, pdf_url, public_link, ai_commentary, raw_data,
       sent_at, created_at,
       clients(name, logo_url)`
    )
    .eq("id", params.id)
    .single();

  if (!report) redirect("/reports");

  // Auth check — verify membership
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", report.agency_id as string)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/reports");

  interface ClientRow { name: string; logo_url: string | null }
  const clientRow = report.clients as unknown as ClientRow | null;
  const clientName = clientRow?.name ?? "Unknown";

  const periodLabel = formatPeriodLabel({
    start: report.period_start as string,
    end: report.period_end as string,
  });

  const status = report.status as ReportStatus;
  const pdfUrl = report.pdf_url as string | null;
  const commentary = report.ai_commentary as unknown as ReportCommentary | null;
  const rawData = report.raw_data as unknown as UnifiedReportData | null;

  return (
    <div className="p-6 max-w-5xl">
      {/* Breadcrumb */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Reports
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{clientName}</h1>
            <StatusBadge status={status} />
            <span className="text-sm text-slate-500">{periodLabel}</span>
          </div>
          {commentary?.executiveSummary?.headline && (
            <p className="mt-1 text-slate-500 text-sm italic">
              &quot;{commentary.executiveSummary.headline}&quot;
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {pdfUrl && (
            <>
              <Button variant="outline" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open PDF
                </a>
              </Button>
              <Button
                asChild
                className="bg-[#0F172A] hover:bg-[#1e293b] text-white"
              >
                <a href={pdfUrl} download={`${clientName}-${periodLabel}.pdf`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-8">
        <ReportTabs
          reportId={params.id}
          status={status}
          pdfUrl={pdfUrl}
          commentary={commentary}
          rawData={rawData}
          clientId={report.client_id as string}
        />
      </div>
    </div>
  );
}
