/**
 * Example rows for `npm run seed` (scripts/seed.ts) ONLY.
 * This module must never be imported by runtime code — production signals
 * come exclusively from the live generation pipeline.
 */
import type { Signal } from "../types";

const day = 86400000;

export const SEED_SIGNALS: Signal[] = [
  {
    id: "seed-xau-swing-1",
    asset: "XAUUSD",
    mode: "swing",
    direction: "long",
    status: "running",
    entry: 3328,
    stop: 3298,
    target1: 3373,
    target2: 3403,
    openedAt: new Date(Date.now() - day * 2).toISOString(),
    rrPlanned: 2.5,
    brainLabel: "Gold supportive",
    brainScore: 4,
    brainConfidence: "medium",
    thesis:
      "Swing LONG XAUUSD — Gold supportive (score 4). Real yields soft, USD drifting lower. Paper signal.",
  },
  {
    id: "seed-btc-swing-1",
    asset: "BTCUSD",
    mode: "swing",
    direction: "short",
    status: "running",
    entry: 98800,
    stop: 100300,
    target1: 96550,
    target2: 95050,
    openedAt: new Date(Date.now() - day).toISOString(),
    rrPlanned: 2.5,
    brainLabel: "BTC bearish",
    brainScore: -2,
    brainConfidence: "medium",
    thesis:
      "Swing SHORT BTCUSD — momentum fading after failed breakout. Paper signal v1.",
  },
  {
    id: "seed-xau-closed-1",
    asset: "XAUUSD",
    mode: "swing",
    direction: "long",
    status: "stopped",
    entry: 3290,
    stop: 3265,
    target1: 3327,
    target2: 3352,
    openedAt: new Date(Date.now() - day * 8).toISOString(),
    closedAt: new Date(Date.now() - day * 6).toISOString(),
    exitPrice: 3264,
    rrPlanned: 2.5,
    rrAchieved: -1,
    brainLabel: "Gold supportive",
    brainScore: 3,
    brainConfidence: "low",
    thesis: "Borderline long into CPI week.",
    postMortem: {
      tag: "event_risk",
      summary: "Stop hit day before CPI — volatility expanded into release.",
      lesson: "Enforce event-driven wait gate before swing entries.",
      analyzedAt: new Date(Date.now() - day * 6).toISOString(),
    },
  },
  {
    id: "seed-btc-closed-1",
    asset: "BTCUSD",
    mode: "swing",
    direction: "long",
    status: "tp2",
    entry: 95200,
    stop: 92800,
    target1: 98800,
    target2: 101200,
    openedAt: new Date(Date.now() - day * 14).toISOString(),
    closedAt: new Date(Date.now() - day * 9).toISOString(),
    exitPrice: 101400,
    rrPlanned: 2.5,
    rrAchieved: 2.6,
    brainLabel: "BTC bullish",
    brainScore: 3,
    brainConfidence: "high",
    thesis: "Momentum long after ETF inflow week.",
    postMortem: {
      tag: "target_hit",
      summary: "TP2 reached — trend continuation played out.",
      lesson: "Log high-confidence momentum setups for weight boost.",
      analyzedAt: new Date(Date.now() - day * 9).toISOString(),
    },
  },
];
