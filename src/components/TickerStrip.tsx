import { connection } from "next/server";
import { fetchAllMarkets, isQuoteStale } from "@/lib/market/quotes";
import type { Asset } from "@/lib/types";

const LABEL: Record<Asset, string> = { XAUUSD: "XAU", BTCUSD: "BTC" };

function fmt(asset: Asset, price: number): string {
  return asset === "BTCUSD"
    ? price.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : price.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Server-rendered header ticker: price, 24h change, LIVE/stale state. */
export async function TickerStrip() {
  // Live quotes must never be baked into a static build.
  await connection();
  const markets = await fetchAllMarkets();
  const assets: Asset[] = ["XAUUSD", "BTCUSD"];
  const anyLive = assets.some((a) => markets[a] && !isQuoteStale(markets[a]));
  const latest = assets
    .map((a) => markets[a]?.asOf)
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop();

  return (
    <div
      className="ticker-strip flex items-center divide-x divide-border font-mono text-[11px]"
      data-num
    >
      {assets.map((asset) => {
        const m = markets[asset];
        if (!m) {
          return (
            <span key={asset} className="flex items-baseline gap-1.5 px-3">
              <span className="text-faint">{LABEL[asset]}</span>
              <span className="text-down">unavail</span>
            </span>
          );
        }
        const up = m.change24hPct >= 0;
        return (
          <span
            key={asset}
            className="flex items-baseline gap-1.5 px-3 first:pl-0"
          >
            <span className="text-faint">{LABEL[asset]}</span>
            <span className="font-medium text-ink">{fmt(asset, m.price)}</span>
            <span className={up ? "text-up" : "text-down"}>
              {up ? "+" : ""}
              {m.change24hPct.toFixed(1)}%
            </span>
          </span>
        );
      })}
      <span
        className={`hidden items-center gap-1.5 px-3 sm:flex ${
          anyLive ? "text-up" : "text-faint"
        }`}
        title={
          latest
            ? `Quotes updated ${fmtTime(latest)} · XAU via COMEX GC=F · BTC via Yahoo BTC-USD`
            : "No live quote"
        }
      >
        <span className={anyLive ? "live-dot" : ""}>{anyLive ? "●" : "○"}</span>
        <span className="uppercase tracking-[0.14em]">
          {anyLive ? "Live" : "Stale"}
        </span>
        {latest && <span className="text-faint">{fmtTime(latest)}</span>}
      </span>
    </div>
  );
}

export function TickerStripSkeleton() {
  return (
    <div className="ticker-strip flex items-center gap-3 px-2 py-1.5">
      <span className="skeleton skeleton-shimmer h-4 w-24" />
      <span className="skeleton skeleton-shimmer h-4 w-24" />
    </div>
  );
}
