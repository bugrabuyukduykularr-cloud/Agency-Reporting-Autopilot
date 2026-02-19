import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const agencyId = session.metadata?.agency_id;
  const planId = session.metadata?.plan_id;
  if (!agencyId || !planId) return;

  const supabase = getSupabase();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  await supabase
    .from("agencies")
    .update({
      stripe_subscription_id: subscriptionId ?? null,
      plan: "active",
      trial_ends_at: null,
    })
    .eq("id", agencyId);

  console.log(
    `[stripe-webhook] checkout.session.completed — agency ${agencyId} → plan ${planId}`
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, plan")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!agency) return;

  let plan: string;
  switch (subscription.status) {
    case "active":
    case "past_due":
      plan = "active";
      break;
    case "canceled":
    case "unpaid":
      plan = "cancelled";
      break;
    default:
      plan = agency.plan as string;
  }

  await supabase.from("agencies").update({ plan }).eq("id", agency.id);

  console.log(
    `[stripe-webhook] subscription.updated — agency ${agency.id} → ${plan} (${subscription.status})`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = getSupabase();
  await supabase
    .from("agencies")
    .update({ plan: "cancelled", stripe_subscription_id: null })
    .eq("stripe_customer_id", customerId);

  console.log(
    `[stripe-webhook] subscription.deleted — customer ${customerId} cancelled`
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!agency) return;

  const attemptCount = invoice.attempt_count ?? 0;
  console.error(
    `[stripe-webhook] invoice.payment_failed — agency ${agency.name}, attempt ${attemptCount}`
  );

  // After 3 failed attempts, suspend the account
  if (attemptCount >= 3) {
    await supabase
      .from("agencies")
      .update({ plan: "cancelled" })
      .eq("id", agency.id);

    console.error(
      `[stripe-webhook] agency ${agency.name} suspended after ${attemptCount} failed payments`
    );
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;
      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook handler error";
    console.error(`[stripe-webhook] Error handling ${event.type}:`, msg);
  }

  return NextResponse.json({ received: true });
}
