/** Feature flags — paywall active when PAYWALL_ENABLED=true and not early access. */
export const FEATURE_FLAGS = {
  paywallEnabled: process.env.PAYWALL_ENABLED === "true",
  earlyAccessFree: process.env.EARLY_ACCESS_FREE !== "false",
  proPriceMonthly: 29,
  proPriceAnnual: 249,
  freeHistoryLimit: 2,
  freeRunningLimit: 1,
} as const;

export function isPaywallActive(): boolean {
  return FEATURE_FLAGS.paywallEnabled && !FEATURE_FLAGS.earlyAccessFree;
}

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type ProFeature =
  | "full_history"
  | "llm_post_mortem"
  | "job_controls"
  | "tuning_insights";

export function isProRequired(feature: ProFeature): boolean {
  if (!isPaywallActive()) return false;
  return true;
}
