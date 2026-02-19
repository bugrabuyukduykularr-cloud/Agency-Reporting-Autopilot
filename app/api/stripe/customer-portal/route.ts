import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agency = await getAgency(supabase);
    if (!agency) {
      return NextResponse.json({ error: "No agency found" }, { status: 404 });
    }

    if (!agency.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: agency.stripe_customer_id,
      return_url: `${baseUrl}/settings?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Portal error";
    console.error("[stripe/customer-portal]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
