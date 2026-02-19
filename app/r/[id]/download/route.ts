import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const token = params.id;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: report } = await supabase
    .from("reports")
    .select("pdf_url, period_start, period_end, clients(name)")
    .eq("public_link", token)
    .single();

  if (!report?.pdf_url) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  const clientRow = report.clients as unknown as { name: string } | null;
  const clientName = clientRow?.name ?? "Report";
  const period = formatPeriodLabel({
    start: report.period_start as string,
    end: report.period_end as string,
  });

  try {
    const pdfResponse = await fetch(report.pdf_url as string);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "PDF not available" },
        { status: 404 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const filename = `${clientName}-${period}.pdf`.replace(
      /[^a-zA-Z0-9\-_.]/g,
      "_"
    );

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}
