import { NextResponse } from "next/server";
import {
  FEATURE_FLAGS,
  isPaywallActive,
  isStripeConfigured,
} from "@/lib/features";
import { appBaseUrl, getStripe, stripePriceId } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isPaywallActive()) {
    return NextResponse.json({
      ok: true,
      mode: "early_access",
      message:
        "All features are free during early access. Set PAYWALL_ENABLED=true to launch billing.",
      proPriceMonthly: FEATURE_FLAGS.proPriceMonthly,
    });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_SECRET_KEY not configured" },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  const form = await request.formData().catch(() => null);
  const body = form
    ? { plan: String(form.get("plan") ?? "monthly") }
    : ((await request.json().catch(() => ({}))) as { plan?: string });

  const plan = body.plan === "annual" ? "annual" : "monthly";
  const priceId = stripePriceId(plan);

  if (!priceId) {
    return NextResponse.json(
      {
        ok: false,
        error: `STRIPE_PRICE_${plan.toUpperCase()} not configured`,
      },
      { status: 503 },
    );
  }

  // Main Desk has no Clerk yet — subscriptions key off the x-desk-user-id
  // header (same identity used by access.ts).
  const deskUserId = request.headers.get("x-desk-user-id")?.trim() || null;

  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/?upgraded=1`,
    cancel_url: `${base}/pro`,
    metadata: deskUserId ? { deskUserId } : {},
    subscription_data: deskUserId
      ? { metadata: { deskUserId } }
      : undefined,
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Checkout session missing URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}

export async function GET() {
  return NextResponse.json({
    earlyAccess: FEATURE_FLAGS.earlyAccessFree,
    paywallEnabled: FEATURE_FLAGS.paywallEnabled,
    paywallActive: isPaywallActive(),
    proPriceMonthly: FEATURE_FLAGS.proPriceMonthly,
    proPriceAnnual: FEATURE_FLAGS.proPriceAnnual,
    stripeConfigured: isStripeConfigured(),
  });
}
