import type { BrainSnapshot, PostMortem, Signal } from "@/lib/types";

export function analyzeStopLoss(
  signal: Signal,
  exitPrice: number,
  brainAtExit?: BrainSnapshot,
): PostMortem {
  const risk = Math.abs(signal.entry - signal.stop);
  const stopDistancePct =
    signal.asset === "BTCUSD"
      ? (risk / signal.entry) * 100
      : (risk / signal.entry) * 100;

  const brainFlipped =
    brainAtExit &&
    ((signal.direction === "long" && brainAtExit.score < 0) ||
      (signal.direction === "short" && brainAtExit.score > 0));

  let tag: PostMortem["tag"] = "good_loss";
  let summary = "Stop hit within planned risk.";
  let lesson = "Review whether entry timing matched brain conviction.";

  if (stopDistancePct < 0.5 && signal.asset === "XAUUSD") {
    tag = "stop_too_tight";
    summary = `Stop was only ${stopDistancePct.toFixed(2)}% from entry — likely inside normal session noise.`;
    lesson = "Consider wider stop (≥1.2× ATR) or wait for cleaner structure.";
  } else if (brainFlipped) {
    tag = "bias_flip";
    summary = `Macro brain flipped to ${brainAtExit!.label} after entry — thesis invalidated before target.`;
    lesson = "Tighten gate: exit early when brain score crosses zero against position.";
  } else if (signal.brainLabel.includes("Event-driven")) {
    tag = "event_risk";
    summary = "Entry may have been too close to a macro event window.";
    lesson = "Enforce event-driven wait gate from Gold Desk before swing entries.";
  } else if (Math.abs(signal.brainScore) <= 3) {
    tag = "wrong_regime";
    summary = "Brain conviction was borderline — score at minimum threshold.";
    lesson = "Raise minimum |score| for new swing signals or require high confidence.";
  }

  return {
    tag,
    summary,
    lesson,
    analyzedAt: new Date().toISOString(),
  };
}

export function analyzeTakeProfit(
  signal: Signal,
  exitPrice: number,
  hit: "tp1" | "tp2",
): PostMortem {
  const r = signal.rrAchieved ?? 0;
  return {
    tag: "target_hit",
    summary: `${hit.toUpperCase()} reached at ${exitPrice}. Achieved ~${r.toFixed(1)}R.`,
    lesson: "Log regime and brain state for future weight tuning.",
    analyzedAt: new Date().toISOString(),
  };
}
