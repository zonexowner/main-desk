export interface YahooQuote {
  price: number;
  change1dPct: number;
  history: number[];
}

interface YahooChartResult {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
}

export async function fetchYahooQuote(
  symbol: string,
  range = "1mo",
): Promise<YahooQuote | null> {
  try {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
    );
    url.searchParams.set("interval", "1d");
    url.searchParams.set("range", range);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MainDesk/1.0)" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChartResult;
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const history = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => c != null && !Number.isNaN(c),
    );
    const price = meta?.regularMarketPrice;
    if (price == null || history.length < 5) return null;

    const prev =
      meta?.chartPreviousClose ?? history[history.length - 2] ?? price;
    const change1dPct = prev !== 0 ? ((price - prev) / prev) * 100 : 0;

    return { price, change1dPct, history };
  } catch {
    return null;
  }
}

/** Wilder's ATR approximation from daily closes (range proxy). */
export function atrFromCloses(closes: number[], period = 14): number {
  if (closes.length < 2) return closes[0] ? closes[0] * 0.008 : 1;
  const ranges: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    ranges.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const slice = ranges.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}
