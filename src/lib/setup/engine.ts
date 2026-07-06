import { getBrainTuning } from "@/lib/brain/brain-config";
import type { MarketSnapshot } from "@/lib/market/quotes";
import type { BrainSnapshot, Direction, Signal, SignalMode } from "@/lib/types";

export interface SetupCandidate {
  signal: Omit<Signal, "id" | "openedAt" | "status">;
  skipReason?: string;
}

export async function buildSetup(
  brain: BrainSnapshot,
  market: MarketSnapshot,
  mode: SignalMode = "swing",
): Promise<SetupCandidate> {
  const tuning = await getBrainTuning();

  if (!brain.tradeAllowed) {
    return {
      signal: placeholder(brain, market, mode),
      skipReason: brain.reason,
    };
  }

  const xauMin = tuning.xauMinScore;
  const btcMin = tuning.btcMinScore;

  const direction: Direction | null =
    brain.score >= xauMin ? "long"
    : brain.score <= -xauMin ? "short"
    : brain.asset === "BTCUSD" && brain.score >= btcMin ? "long"
    : brain.asset === "BTCUSD" && brain.score <= -btcMin ? "short"
    : null;

  if (!direction) {
    return {
      signal: placeholder(brain, market, mode),
      skipReason: "Score not strong enough for a directional setup.",
    };
  }

  const risk = market.atr * tuning.atrStopMult;
  const entry = market.price;
  const stop =
    direction === "long" ? entry - risk : entry + risk;
  const target1 =
    direction === "long"
      ? entry + risk * tuning.rrT1
      : entry - risk * tuning.rrT1;
  const target2 =
    direction === "long"
      ? entry + risk * tuning.rrT2
      : entry - risk * tuning.rrT2;

  const thesis =
    `${mode === "swing" ? "Swing" : "Day"} ${direction.toUpperCase()} ${brain.asset} — ` +
    `${brain.label} (score ${brain.score}, ${brain.confidence} confidence). ` +
    `Stop ${risk.toFixed(0)} pts (${tuning.atrStopMult}× ATR). Paper signal.`;

  return {
    signal: {
      asset: brain.asset,
      mode,
      direction,
      entry: round(entry, brain.asset),
      stop: round(stop, brain.asset),
      target1: round(target1, brain.asset),
      target2: round(target2, brain.asset),
      rrPlanned: tuning.rrT2,
      brainLabel: brain.label,
      brainScore: brain.score,
      brainConfidence: brain.confidence,
      thesis,
    },
  };
}

function round(n: number, asset: Signal["asset"]): number {
  return asset === "BTCUSD" ? Math.round(n) : Math.round(n * 10) / 10;
}

function placeholder(
  brain: BrainSnapshot,
  market: MarketSnapshot,
  mode: SignalMode,
): Omit<Signal, "id" | "openedAt" | "status"> {
  return {
    asset: brain.asset,
    mode,
    direction: "long",
    entry: market.price,
    stop: market.price,
    target1: market.price,
    target2: market.price,
    rrPlanned: 0,
    brainLabel: brain.label,
    brainScore: brain.score,
    brainConfidence: brain.confidence,
    thesis: "",
  };
}

export function unrealizedR(
  signal: Signal,
  price: number,
): number {
  const risk = Math.abs(signal.entry - signal.stop);
  if (risk === 0) return 0;
  const move =
    signal.direction === "long"
      ? price - signal.entry
      : signal.entry - price;
  return move / risk;
}
