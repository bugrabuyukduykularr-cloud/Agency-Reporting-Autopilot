import { createServerClient } from "@supabase/ssr";

// Transparent 1x1 GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * GET /api/track/open?r={publicLink}&e={recipientEmail}
 *
 * PUBLIC — no auth required. Called by the email client when the
 * tracking pixel loads.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicLink = searchParams.get("r");
  const recipientEmail = searchParams.get("e");

  // Always return the pixel regardless of whether tracking succeeds
  const pixelResponse = () =>
    new Response(PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

  if (!publicLink || !recipientEmail) {
    return pixelResponse();
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Find report by public_link
    const { data: report } = await supabase
      .from("reports")
      .select("id, opened_at")
      .eq("public_link", publicLink)
      .single();

    if (!report) return pixelResponse();

    // Find email_delivery by report_id + recipient_email where not yet opened
    const { data: delivery } = await supabase
      .from("email_deliveries")
      .select("id, opened_at")
      .eq("report_id", report.id as string)
      .eq("recipient_email", recipientEmail)
      .is("opened_at", null)
      .limit(1)
      .single();

    if (delivery) {
      await supabase
        .from("email_deliveries")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", delivery.id as string);
    }

    // Update reports.opened_at if this is the first open
    if (!report.opened_at) {
      await supabase
        .from("reports")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", report.id as string);
    }
  } catch (err) {
    console.error("[track/open] Error:", err);
  }

  return pixelResponse();
}
