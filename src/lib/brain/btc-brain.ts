import { getBrainTuning } from "@/lib/brain/brain-config";
import { fetchGoldDeskBias } from "@/lib/brain/xau-brain";
import { isDeskFastMode } from "@/lib/dev/fast-mode";
import { fetchYahooQuote } from "@/lib/market/yahoo";
import type { MarketSnapshot } from "@/lib/market/quotes";
import type { BrainSnapshot } from "@/lib/types";

export interface BtcMacroInputs {
  change24h: number;
  change5dPct: number;
  qqqChange24h: number;
  dxyChange24h: number;
  goldChange24h: number;
  riskTone: "risk-on" | "risk-off" | "neutral";
}

export interface BtcDriver {
  name: string;
  score: number;
  detail: string;
}

function scoreBand(
  v: number,
  strongPos: number,
  weakPos: number,
  weakNeg: number,
  strongNeg: number,
  invert = false,
): number {
  if (invert) {
    if (v >= strongPos) return 2;
    if (v >= weakPos) return 1;
    if (v <= strongNeg) return -2;
    if (v <= weakNeg) return -1;
    return 0;
  }
  if (v <= strongPos) return 2;
  if (v <= weakPos) return 1;
  if (v >= strongNeg) return -2;
  if (v >= weakNeg) return -1;
  return 0;
}

function pctChange(current: number, past: number): number {
  if (past === 0) return 0;
  return ((current - past) / past) * 100;
}

export async function fetchBtcMacroInputs(
  market: MarketSnapshot,
  goldChange24h?: number,
): Promise<BtcMacroInputs> {
  const hist = market.history;
  const past5 =
    hist.length >= 6 ? hist[hist.length - 6] : hist[0] ?? market.price;

  if (isDeskFastMode()) {
    return {
      change24h: market.change24hPct,
      change5dPct: pctChange(market.price, past5),
      qqqChange24h: 0.3,
      dxyChange24h: -0.1,
      goldChange24h: goldChange24h ?? 0,
      riskTone: "neutral",
    };
  }

  const [qqq, dxy, goldDesk] = await Promise.all([
    fetchYahooQuote("QQQ"),
    fetchYahooQuote("DX-Y.NYB"),
    fetchGoldDeskBias(),
  ]);

  return {
    change24h: market.change24hPct,
    change5dPct: pctChange(market.price, past5),
    qqqChange24h: qqq?.change1dPct ?? 0,
    dxyChange24h: dxy?.change1dPct ?? 0,
    goldChange24h: goldChange24h ?? 0,
    riskTone: goldDesk?.riskTone ?? "neutral",
  };
}

export function computeBtcBrain(
  market: MarketSnapshot,
  macro: BtcMacroInputs,
  thresholds: { tradeMinScore: number },
): BrainSnapshot {
  const drivers: BtcDriver[] = [
    {
      // Higher change = bullish → inverted band (v >= threshold scores +).
      name: "24h momentum",
      score: scoreBand(macro.change24h, 2, 0.8, -0.8, -2, true),
      detail: `${macro.change24h.toFixed(2)}%`,
    },
    {
      name: "5d trend",
      score: scoreBand(macro.change5dPct, 4, 1.5, -1.5, -4, true),
      detail: `${macro.change5dPct.toFixed(2)}%`,
    },
    {
      name: "QQQ risk",
      score: scoreBand(macro.qqqChange24h, 1.2, 0.4, -0.4, -1.2, true),
      detail: `QQQ ${macro.qqqChange24h.toFixed(2)}%`,
    },
    {
      // Falling USD = BTC tailwind → standard band (v <= threshold scores +).
      name: "USD (DXY)",
      score: scoreBand(macro.dxyChange24h, -0.35, -0.12, 0.12, 0.35),
      detail: `DXY ${macro.dxyChange24h.toFixed(2)}%`,
    },
    {
      name: "Gold sync",
      score: goldSyncScore(macro.change24h, macro.goldChange24h),
      detail: `BTC ${macro.change24h.toFixed(2)}% · XAU ${macro.goldChange24h.toFixed(2)}%`,
    },
    {
      name: "Macro risk tone",
      score:
        macro.riskTone === "risk-on"
          ? 1
          : macro.riskTone === "risk-off"
            ? -1
            : 0,
      detail: macro.riskTone,
    },
  ];

  const score = drivers.reduce((sum, d) => sum + d.score, 0);
  const label =
    score >= 3 ? "BTC bullish"
    : score <= -3 ? "BTC bearish"
    : "BTC neutral";

  const aligned = drivers.filter((d) => d.score !== 0).length;
  const confidence =
    Math.abs(score) >= 5 && aligned >= 4
      ? "high"
      : Math.abs(score) >= 3 && aligned >= 3
        ? "medium"
        : "low";

  const tradeAllowed =
    Math.abs(score) >= thresholds.tradeMinScore && confidence !== "low";

  const reason =
    `Macro score ${score} from ${drivers.length} drivers — ` +
    drivers.map((d) => `${d.name} ${d.score >= 0 ? "+" : ""}${d.score}`).join(", ");

  return {
    asset: "BTCUSD",
    label,
    score,
    confidence,
    reason,
    tradeAllowed,
    updatedAt: new Date().toISOString(),
    drivers,
  };
}

function goldSyncScore(btcCh: number, goldCh: number): number {
  if (btcCh >= 0.3 && goldCh >= 0.2) return 1;
  if (btcCh <= -0.3 && goldCh <= -0.2) return 1;
  if (btcCh >= 0.5 && goldCh <= -0.2) return -1;
  if (btcCh <= -0.5 && goldCh >= 0.2) return -1;
  return 0;
}

export async function getBtcBrain(
  market: MarketSnapshot,
  goldChange24h?: number,
): Promise<BrainSnapshot> {
  const [macro, tuning] = await Promise.all([
    fetchBtcMacroInputs(market, goldChange24h),
    getBrainTuning(),
  ]);
  return computeBtcBrain(market, macro, {
    tradeMinScore: tuning.btcTradeMinScore,
  });
}
