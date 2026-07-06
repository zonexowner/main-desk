import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { proSubscriptions } from "@/lib/db/schema";
import { isPaywallActive } from "@/lib/features";

export type AccessTier = "pro" | "free";

export interface UserAccess {
  tier: AccessTier;
  paywallActive: boolean;
  userId: string | null;
}

function isAllowlisted(userId: string | null): boolean {
  const list = process.env.PRO_ALLOWLIST?.split(",").map((s) => s.trim()) ?? [];
  if (!list.length || !userId) return false;
  return list.includes(userId);
}

async function resolveUserId(): Promise<string | null> {
  const h = await headers();
  return h.get("x-desk-user-id")?.trim() ?? null;
}

export async function isProSubscriber(userId: string): Promise<boolean> {
  if (isAllowlisted(userId)) return true;

  const db = getDb();
  if (!db) return false;

  try {
    const [row] = await db
      .select()
      .from(proSubscriptions)
      .where(eq(proSubscriptions.clerkUserId, userId))
      .limit(1);

    if (!row) return false;
    return row.status === "active" || row.status === "trialing";
  } catch {
    return false;
  }
}

export async function getUserAccess(): Promise<UserAccess> {
  if (!isPaywallActive()) {
    return { tier: "pro", paywallActive: false, userId: null };
  }

  const h = await headers();
  const bypass = process.env.PRO_BYPASS_TOKEN?.trim();
  const auth = h.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bypass && bearer === bypass) {
    return { tier: "pro", paywallActive: true, userId: "bypass" };
  }

  const userId = await resolveUserId();
  if (!userId) {
    return { tier: "free", paywallActive: true, userId: null };
  }

  const pro = await isProSubscriber(userId);
  return {
    tier: pro ? "pro" : "free",
    paywallActive: true,
    userId,
  };
}

export function canViewFullHistory(access: UserAccess): boolean {
  return access.tier === "pro" || !access.paywallActive;
}

export function canViewLlmNarratives(access: UserAccess): boolean {
  return access.tier === "pro" || !access.paywallActive;
}

export function canRunJobs(access: UserAccess): boolean {
  return access.tier === "pro" || !access.paywallActive;
}
