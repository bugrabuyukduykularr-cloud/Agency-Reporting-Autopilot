import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { getStripe } from "@/lib/stripe/client";
import { getPlanById, type PlanId } from "@/lib/stripe/plans";

export async function POST(request: Request) {
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

    const body = (await request.json()) as {
      planId: PlanId;
      interval: "monthly" | "annual";
    };

    const plan = getPlanById(body.planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId =
      body.interval === "annual"
        ? plan.stripePriceAnnual
        : plan.stripePriceMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured" },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    let customerId = agency.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { agency_id: agency.id, user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("agencies")
        .update({ stripe_customer_id: customerId })
        .eq("id", agency.id);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?tab=billing&success=true`,
      cancel_url: `${baseUrl}/upgrade?canceled=true`,
      metadata: {
        agency_id: agency.id,
        plan_id: body.planId,
        interval: body.interval,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout error";
    console.error("[stripe/create-checkout]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
