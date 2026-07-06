import { atrFromCloses, fetchYahooQuote } from "@/lib/market/yahoo";
import { isDeskFastMode } from "@/lib/dev/fast-mode";
import type { Asset } from "@/lib/types";

const SYMBOLS: Record<Asset, string> = {
  XAUUSD: "GC=F",
  BTCUSD: "BTC-USD",
};

export interface MarketSnapshot {
  asset: Asset;
  price: number;
  change24hPct: number;
  atr: number;
  history: number[];
  /** True only when the price came from a live Yahoo fetch. */
  live: boolean;
  /** Provenance, e.g. "yahoo:GC=F" or "fallback:dev". */
  source: string;
  /** ISO timestamp of when this quote was fetched. */
  asOf: string;
}

/** Dev-only fallbacks. NEVER returned in production — prod gets null instead. */
const DEV_FALLBACK: Record<Asset, Omit<MarketSnapshot, "asOf">> = {
  XAUUSD: {
    asset: "XAUUSD",
    price: 3342,
    change24hPct: 0.4,
    atr: 28,
    history: [3310, 3320, 3330, 3338, 3342],
    live: false,
    source: "fallback:dev",
  },
  BTCUSD: {
    asset: "BTCUSD",
    price: 98200,
    change24hPct: -0.8,
    atr: 2100,
    history: [99500, 98800, 98100, 98400, 98200],
    live: false,
    source: "fallback:dev",
  },
};

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  snapshot: MarketSnapshot | null;
  at: number;
}

const cache = new Map<Asset, CacheEntry>();
const inFlight = new Map<Asset, Promise<MarketSnapshot | null>>();

async function fetchFresh(asset: Asset): Promise<MarketSnapshot | null> {
  const symbol = SYMBOLS[asset];
  const quote = await fetchYahooQuote(symbol);
  if (!quote) {
    if (process.env.NODE_ENV !== "production") {
      return { ...DEV_FALLBACK[asset], asOf: new Date().toISOString() };
    }
    // Production: no fake numbers. Callers must render "unavailable".
    return null;
  }

  const atr = atrFromCloses(quote.history);
  return {
    asset,
    price: quote.price,
    change24hPct: quote.change1dPct,
    atr: Math.max(atr, quote.price * 0.003),
    history: quote.history,
    live: true,
    source: `yahoo:${symbol}`,
    asOf: new Date().toISOString(),
  };
}

/**
 * Live market snapshot with a 60s in-memory cache and in-flight dedupe.
 * Returns null in production when the quote source is unavailable.
 */
export async function fetchMarket(asset: Asset): Promise<MarketSnapshot | null> {
  if (isDeskFastMode()) {
    return { ...DEV_FALLBACK[asset], asOf: new Date().toISOString() };
  }

  const cached = cache.get(asset);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS && cached.snapshot) {
    return cached.snapshot;
  }

  const pending = inFlight.get(asset);
  if (pending) return pending;

  const p = fetchFresh(asset)
    .then((snapshot) => {
      cache.set(asset, { snapshot, at: Date.now() });
      return snapshot;
    })
    .finally(() => inFlight.delete(asset));
  inFlight.set(asset, p);
  return p;
}

export async function fetchAllMarkets(): Promise<
  Record<Asset, MarketSnapshot | null>
> {
  const [xau, btc] = await Promise.all([
    fetchMarket("XAUUSD"),
    fetchMarket("BTCUSD"),
  ]);
  return { XAUUSD: xau, BTCUSD: btc };
}

/** Quote considered stale when older than 5 minutes or not live. */
export function isQuoteStale(snapshot: MarketSnapshot | null): boolean {
  if (!snapshot || !snapshot.live) return true;
  return Date.now() - +new Date(snapshot.asOf) > 5 * 60_000;
}
