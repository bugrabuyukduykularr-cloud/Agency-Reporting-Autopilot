import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReportToAllRecipients } from "@/lib/email/sender";

/**
 * POST /api/reports/[id]/resend
 *
 * Manually resends a report email to all client contact emails.
 * Requires the caller to be a member of the report's agency.
 */
export async function POST(
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

  // Verify report exists and caller owns the agency
  const { data: report } = await supabase
    .from("reports")
    .select("id, agency_id, status, pdf_url")
    .eq("id", params.id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status !== "ready" && report.status !== "sent") {
    return NextResponse.json(
      { error: "Report is not ready to be sent" },
      { status: 422 }
    );
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", report.agency_id as string)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sendReportToAllRecipients(params.id, supabase);

  return NextResponse.json({
    success: result.success,
    sentCount: result.sentCount,
    failedEmails: result.failedEmails,
  });
}
