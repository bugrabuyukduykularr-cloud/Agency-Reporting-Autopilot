import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}
