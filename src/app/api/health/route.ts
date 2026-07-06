import { NextResponse } from "next/server";
import { isDbConfigured, getDb } from "@/lib/db";
import { fetchAllMarkets, isQuoteStale } from "@/lib/market/quotes";
import { getLastJobRun } from "@/lib/services/signal-store";
import { signals } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [markets, lastJob] = await Promise.all([
    fetchAllMarkets(),
    getLastJobRun(),
  ]);

  let dbOk = false;
  let dbError: string | undefined;
  const db = getDb();
  if (db) {
    try {
      await db.select({ n: sql<number>`count(*)` }).from(signals);
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : "query failed";
    }
  }

  const marketState = {
    XAUUSD: markets.XAUUSD
      ? {
          live: markets.XAUUSD.live,
          stale: isQuoteStale(markets.XAUUSD),
          source: markets.XAUUSD.source,
          asOf: markets.XAUUSD.asOf,
        }
      : null,
    BTCUSD: markets.BTCUSD
      ? {
          live: markets.BTCUSD.live,
          stale: isQuoteStale(markets.BTCUSD),
          source: markets.BTCUSD.source,
          asOf: markets.BTCUSD.asOf,
        }
      : null,
  };

  const marketsOk =
    Boolean(markets.XAUUSD && markets.BTCUSD) &&
    !isQuoteStale(markets.XAUUSD) &&
    !isQuoteStale(markets.BTCUSD);

  const ok =
    (process.env.NODE_ENV !== "production" || (isDbConfigured() && dbOk)) &&
    (process.env.NODE_ENV !== "production" || marketsOk);

  return NextResponse.json(
    {
      ok,
      db: { configured: isDbConfigured(), reachable: dbOk, error: dbError },
      markets: marketState,
      lastJob,
    },
    { status: ok ? 200 : 503 },
  );
}
