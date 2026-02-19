import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { getStripe } from "@/lib/stripe/client";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agency = await getAgency(supabase);
    if (!agency?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: agency.stripe_customer_id,
      limit: 24,
    });

    const formatted = invoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
    }));

    return NextResponse.json({ invoices: formatted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invoice fetch error";
    console.error("[stripe/invoices]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
