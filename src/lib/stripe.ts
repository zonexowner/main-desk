import Stripe from "stripe";
import { isStripeConfigured } from "@/lib/features";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3004"
  );
}

export function stripePriceId(plan: "monthly" | "annual"): string | null {
  if (plan === "monthly") {
    return process.env.STRIPE_PRICE_MONTHLY ?? null;
  }
  return process.env.STRIPE_PRICE_ANNUAL ?? null;
}
