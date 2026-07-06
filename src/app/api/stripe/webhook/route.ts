import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { proSubscriptions } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

async function upsertProSubscription(data: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
}) {
  const db = getDb();
  if (!db) return;

  const [existing] = await db
    .select()
    .from(proSubscriptions)
    .where(eq(proSubscriptions.clerkUserId, data.userId))
    .limit(1);

  if (existing) {
    await db
      .update(proSubscriptions)
      .set({
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId:
          data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(proSubscriptions.clerkUserId, data.userId));
    return;
  }

  await db.insert(proSubscriptions).values({
    clerkUserId: data.userId,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    status: data.status,
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json(
      { ok: false, error: "webhook not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "missing signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.deskUserId;
    if (userId) {
      await upsertProSubscription({
        userId,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : null,
        status: "active",
      });
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.deskUserId;
    if (userId) {
      await upsertProSubscription({
        userId,
        stripeCustomerId:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        status: sub.status,
      });
    }
  }

  return NextResponse.json({ received: true });
}
