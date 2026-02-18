import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import puppeteer from "puppeteer";
import type { ReportTemplateProps } from "@/components/pdf/report-template";
import type { UnifiedReportData } from "@/types/report-data";
import type { ReportCommentary } from "@/types/ai-commentary";
import { formatPeriodLabel } from "@/lib/utils/date-ranges";
import { renderReportHtml } from "@/lib/pdf/render-html";

// ── Row types from Supabase join ──────────────────────────────────────────────

interface ReportRow {
  id: string;
  client_id: string;
  agency_id: string;
  period_start: string;
  period_end: string;
  raw_data: Record<string, unknown> | null;
  ai_commentary: Record<string, unknown> | null;
  clients: {
    name: string;
    logo_url: string | null;
    agency_id: string;
    agencies: {
      name: string;
      logo_url: string | null;
      primary_color: string;
      secondary_color: string;
      reply_to_email: string | null;
    };
  };
}

/**
 * POST /api/reports/generate-pdf
 *
 * Internal — requires X-Service-Key header.
 * Renders the report template to HTML via React, converts to PDF with
 * Puppeteer, uploads to Supabase Storage, and returns the signed URL.
 */
export async function POST(request: Request) {
  // ── Service-role auth ────────────────────────────────────────────────────
  const serviceKey = request.headers.get("X-Service-Key");
  if (!serviceKey || serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reportId: string };
  try {
    body = (await request.json()) as { reportId: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { reportId } = body;
  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // ── Fetch report + client + agency ───────────────────────────────────────
  const { data: reportRaw, error: reportErr } = await supabase
    .from("reports")
    .select(
      `id, client_id, agency_id, period_start, period_end, raw_data, ai_commentary,
       clients(name, logo_url, agency_id,
         agencies(name, logo_url, primary_color, secondary_color, reply_to_email)
       )`
    )
    .eq("id", reportId)
    .single();

  if (reportErr || !reportRaw) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = reportRaw as unknown as ReportRow;
  const client = report.clients;
  const agency = client.agencies;

  if (!report.raw_data || !report.ai_commentary) {
    return NextResponse.json(
      { error: "Report data or commentary not yet available" },
      { status: 422 }
    );
  }

  const reportData = report.raw_data as unknown as UnifiedReportData;
  const commentary = report.ai_commentary as unknown as ReportCommentary;

  const periodLabel = formatPeriodLabel({
    start: report.period_start,
    end: report.period_end,
  });

  // ── Build template props ─────────────────────────────────────────────────
  const props: ReportTemplateProps = {
    reportData,
    commentary,
    agencyName: agency.name,
    agencyLogoUrl: agency.logo_url,
    agencyPrimaryColor: agency.primary_color ?? "#3b82f6",
    agencySecondaryColor: agency.secondary_color ?? "#0f172a",
    agencyEmail: agency.reply_to_email ?? "",
    clientName: client.name,
    clientLogoUrl: client.logo_url,
    periodLabel,
    generatedAt: new Date().toISOString(),
    reportId,
  };

  // ── Render to HTML ───────────────────────────────────────────────────────
  const fullHtml = renderReportHtml(props);

  // ── Puppeteer → PDF ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 30000 });
    await page.emulateMediaType("screen");
    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    await browser.close();
    pdfBuffer = Buffer.from(pdfData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Puppeteer error";
    console.error("[generate-pdf] Puppeteer failed:", msg);
    return NextResponse.json({ error: `PDF render failed: ${msg}` }, { status: 500 });
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────
  const storagePath = `${report.agency_id}/${report.client_id}/${reportId}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from("reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("[generate-pdf] Storage upload failed:", uploadErr.message);
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  // ── Generate signed URL (1 year) ─────────────────────────────────────────
  const { data: signedData, error: signedErr } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 31536000);

  if (signedErr || !signedData) {
    console.error("[generate-pdf] Signed URL failed:", signedErr?.message);
    return NextResponse.json(
      { error: "Failed to create signed URL" },
      { status: 500 }
    );
  }

  const pdfUrl = signedData.signedUrl;

  // ── Update report record ─────────────────────────────────────────────────
  await supabase
    .from("reports")
    .update({
      pdf_url: pdfUrl,
      status: "ready",
    })
    .eq("id", reportId);

  console.log(`[generate-pdf] PDF ready for report ${reportId}`);
  return NextResponse.json({ success: true, pdfUrl });
}
