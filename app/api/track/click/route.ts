import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /api/track/click?r={publicLink}&e={email}&url={destination}
 *
 * PUBLIC — no auth required. Tracks link clicks from report emails
 * and redirects to the destination URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicLink = searchParams.get("r");
  const recipientEmail = searchParams.get("e");
  const destinationUrl = searchParams.get("url");

  // Always redirect even if tracking fails
  if (!destinationUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  if (publicLink && recipientEmail) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );

      const { data: report } = await supabase
        .from("reports")
        .select("id")
        .eq("public_link", publicLink)
        .single();

      if (report) {
        await supabase
          .from("email_deliveries")
          .update({ clicked_at: new Date().toISOString() })
          .eq("report_id", report.id as string)
          .eq("recipient_email", recipientEmail)
          .is("clicked_at", null);
      }
    } catch (err) {
      console.error("[track/click] Error:", err);
    }
  }

  return NextResponse.redirect(destinationUrl);
}
