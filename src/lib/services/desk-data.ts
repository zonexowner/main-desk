import { canViewFullHistory, getUserAccess } from "@/lib/auth/access";
import { getBrainTuning } from "@/lib/brain/brain-config";
import { isLlmPostMortemConfigured } from "@/lib/brain/post-mortem-llm";
import { FEATURE_FLAGS, isPaywallActive } from "@/lib/features";
import { fetchAllMarkets, isQuoteStale } from "@/lib/market/quotes";
import {
  computeDeskStats,
  listSignals,
} from "@/lib/services/signal-store";
import {
  getBrains,
  partitionSignals,
} from "@/lib/services/signal-engine";
import { unrealizedR } from "@/lib/setup/engine";
import type { Asset, BrainSnapshot, DeskStats, Signal } from "@/lib/types";

function stripNarratives<T extends { postMortem?: { narrative?: string } }>(
  rows: T[],
): T[] {
  return rows.map((s) =>
    s.postMortem?.narrative
      ? { ...s, postMortem: { ...s.postMortem, narrative: undefined } }
      : s,
  );
}

/** Client-safe market state — no history array, explicit staleness. */
export interface MarketTicker {
  asset: Asset;
  price: number | null;
  change24hPct: number | null;
  live: boolean;
  stale: boolean;
  source: string | null;
  asOf: string | null;
}

export interface DeskPayload {
  brains: BrainSnapshot[];
  markets: MarketTicker[];
  running: (Signal & { markPrice?: number; unrealizedR?: number })[];
  today: Signal[];
  history: Signal[];
  stats: DeskStats;
  /** Earliest openedAt across all signals — "desk started" date. */
  deskStartedAt: string | null;
  access: Awaited<ReturnType<typeof getUserAccess>>;
  tuning: Awaited<ReturnType<typeof getBrainTuning>> | null;
  llmConfigured: boolean;
  paywallActive: boolean;
  proPriceMonthly: number;
}

export async function getDeskPayload(): Promise<DeskPayload> {
  const markets = await fetchAllMarkets();

  const [all, brains, access, tuning] = await Promise.all([
    listSignals(),
    getBrains(markets),
    getUserAccess(),
    getBrainTuning(),
  ]);

  const { running, today, history } = partitionSignals(all);
  const stats = computeDeskStats(history);
  const fullAccess = canViewFullHistory(access);

  const tickers: MarketTicker[] = (["XAUUSD", "BTCUSD"] as Asset[]).map(
    (asset) => {
      const m = markets[asset];
      return {
        asset,
        price: m?.price ?? null,
        change24hPct: m?.change24hPct ?? null,
        live: m?.live ?? false,
        stale: isQuoteStale(m),
        source: m?.source ?? null,
        asOf: m?.asOf ?? null,
      };
    },
  );

  const runningWithR = running.map((s) => {
    const m = markets[s.asset];
    if (!m) return s;
    return {
      ...s,
      markPrice: m.price,
      unrealizedR: Math.round(unrealizedR(s, m.price) * 10) / 10,
    };
  });

  const deskStartedAt = all.length
    ? all.reduce(
        (min, s) => (s.openedAt < min ? s.openedAt : min),
        all[0].openedAt,
      )
    : null;

  return {
    brains,
    markets: tickers,
    running: fullAccess
      ? runningWithR
      : runningWithR.slice(0, FEATURE_FLAGS.freeRunningLimit),
    today: fullAccess ? today : today.slice(0, 1),
    history: fullAccess
      ? history
      : stripNarratives(history.slice(0, FEATURE_FLAGS.freeHistoryLimit)),
    stats: fullAccess
      ? stats
      : { ...stats, totalClosed: Math.min(stats.totalClosed, 2) },
    deskStartedAt,
    access,
    tuning: fullAccess ? tuning : null,
    llmConfigured: isLlmPostMortemConfigured(),
    paywallActive: isPaywallActive(),
    proPriceMonthly: FEATURE_FLAGS.proPriceMonthly,
  };
}
