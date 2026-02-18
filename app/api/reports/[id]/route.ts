import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";
import type { ReportCommentary } from "@/types/ai-commentary";

/**
 * GET /api/reports/[id]
 *
 * Returns a single report with essential fields.
 * Used by the frontend to poll report status and get the download link.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select(
      `id, client_id, agency_id, period_start, period_end,
       status, pdf_url, public_link, ai_commentary, raw_data,
       sent_at, opened_at, created_at,
       clients(name, logo_url)`
    )
    .eq("id", params.id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify caller is a member of the owning agency
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", report.agency_id as string)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  interface ClientRow { name: string; logo_url: string | null }
  const clientRow = report.clients as unknown as ClientRow | null;

  const periodLabel = formatPeriodLabel({
    start: report.period_start as string,
    end: report.period_end as string,
  });

  // Extract commentary summary (headline only — keep response small)
  const commentary = report.ai_commentary as unknown as ReportCommentary | null;
  const commentarySummary = commentary
    ? {
        headline: commentary.executiveSummary?.headline ?? "",
        overallSentiment: commentary.executiveSummary?.overallSentiment ?? "neutral",
        model: commentary.model ?? "",
        tokensUsed: commentary.tokensUsed ?? 0,
        generatedAt: commentary.generatedAt ?? "",
      }
    : null;

  return NextResponse.json({
    id: report.id,
    clientId: report.client_id,
    agencyId: report.agency_id,
    clientName: clientRow?.name ?? "Unknown",
    clientLogoUrl: clientRow?.logo_url ?? null,
    periodStart: report.period_start,
    periodEnd: report.period_end,
    periodLabel,
    status: report.status,
    pdfUrl: report.pdf_url,
    publicLink: report.public_link,
    sentAt: report.sent_at,
    openedAt: report.opened_at,
    createdAt: report.created_at,
    commentarySummary,
    hasRawData: report.raw_data !== null,
  });
}
