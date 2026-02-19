import { createServerClient } from "@supabase/ssr";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";
import { PublicReportClient } from "./client";

interface ReportRow {
  id: string;
  status: string;
  pdf_url: string | null;
  public_link: string;
  period_start: string;
  period_end: string;
  clients: { name: string } | null;
  agencies: {
    name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  } | null;
}

export default async function PublicReportPage({
  params,
}: {
  params: { id: string };
}) {
  const token = params.id;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data } = await supabase
    .from("reports")
    .select(
      `id, status, pdf_url, public_link, period_start, period_end,
       clients(name),
       agencies(name, logo_url, primary_color, secondary_color)`
    )
    .eq("public_link", token)
    .single();

  const report = data as unknown as ReportRow | null;

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-5xl font-bold text-slate-300">404</div>
          <h1 className="text-lg font-semibold text-slate-700">
            Report Not Found
          </h1>
          <p className="text-sm text-slate-500">
            This report link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const clientName = report.clients?.name ?? "Client";
  const agency = report.agencies;
  const agencyName = agency?.name ?? "Agency";
  const primaryColor = agency?.primary_color ?? "#3B82F6";
  const logoUrl = agency?.logo_url ?? null;
  const periodLabel = formatPeriodLabel({
    start: report.period_start,
    end: report.period_end,
  });

  return (
    <PublicReportClient
      reportId={report.id}
      token={token}
      status={report.status}
      pdfUrl={report.pdf_url}
      clientName={clientName}
      agencyName={agencyName}
      primaryColor={primaryColor}
      logoUrl={logoUrl}
      periodLabel={periodLabel}
    />
  );
}
