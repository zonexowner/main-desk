import Link from "next/link";
import {
  FEATURE_FLAGS,
  isPaywallActive,
  isStripeConfigured,
} from "@/lib/features";

export const metadata = {
  title: "Pro — Main Desk",
  description:
    "Full signal history, LLM post-mortem narratives, brain tuning insights, and CSV export.",
};

// Paywall/Stripe state comes from env at request time, not build time.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    name: "Every signal, live and closed",
    detail: "Free tier shows 1 running + 2 closed. Pro shows the full desk.",
  },
  {
    name: "Full track record + CSV export",
    detail: "Every closed paper trade with logged entry, exit, and R.",
  },
  {
    name: "LLM post-mortem narratives",
    detail: "Rule tags stay deterministic; narratives add context on losses.",
  },
  {
    name: "Brain tuning insights",
    detail: "Current thresholds and the weekly tuning job's adjustments.",
  },
];

export default function ProPage() {
  const active = isPaywallActive();
  const stripeReady = isStripeConfigured();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <p className="microlabel">Subscription</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
          Main Desk Pro
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          The signal layer. Gold Desk ($39/mo) covers macro research — Main
          Desk Pro covers the paper trades built on top of it.
        </p>
      </header>

      <div className="panel border-accent/30 p-6">
        <div className="flex items-baseline gap-2" data-num>
          <p className="font-mono text-[32px] font-semibold leading-none text-ink">
            ${FEATURE_FLAGS.proPriceMonthly}
          </p>
          <p className="font-mono text-[13px] text-muted">/mo</p>
          <p className="ml-auto font-mono text-[12px] text-faint">
            ${FEATURE_FLAGS.proPriceAnnual}/yr · ~2 months free
          </p>
        </div>

        <ul className="mt-6 space-y-4">
          {FEATURES.map((f) => (
            <li key={f.name} className="flex gap-3">
              <span className="mt-1.5 block h-1 w-1 shrink-0 bg-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-medium text-ink">{f.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {f.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {active && stripeReady ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <form action="/api/stripe/checkout" method="POST">
              <input type="hidden" name="plan" value="monthly" />
              <button type="submit" className="btn btn-primary">
                Subscribe monthly
              </button>
            </form>
            <form action="/api/stripe/checkout" method="POST">
              <input type="hidden" name="plan" value="annual" />
              <button type="submit" className="btn btn-secondary">
                Annual
              </button>
            </form>
          </div>
        ) : (
          <p className="mt-6 rounded-[4px] border border-border bg-surface2 p-3 text-[13px] leading-relaxed text-muted">
            {active
              ? "Billing is being configured — checkout opens shortly."
              : "Early access: everything is free right now. Billing turns on with PAYWALL_ENABLED=true."}
          </p>
        )}
      </div>

      <div className="panel p-4">
        <p className="microlabel">What Pro is not</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Not trade advice, not a live track record. Signals are paper until
          30+ closed trades with logged exits — the disclaimer stays until the
          data earns its removal.
        </p>
      </div>

      <Link
        href="/"
        className="nav-link !text-accent hover:!text-accent"
      >
        ← Back to desk
      </Link>
    </div>
  );
}
