export type Asset = "XAUUSD" | "BTCUSD";
export type Direction = "long" | "short";
export type SignalMode = "swing" | "day";
export type SignalStatus =
  | "running"
  | "stopped"
  | "tp1"
  | "tp2"
  | "closed"
  | "expired";

export type BiasLabel =
  | "Gold supportive"
  | "Gold headwind"
  | "Mixed / range-bound"
  | "Event-driven (wait)"
  | "BTC bullish"
  | "BTC bearish"
  | "BTC neutral";

export interface BrainDriver {
  name: string;
  score: number;
  detail: string;
}

export interface BrainSnapshot {
  asset: Asset;
  label: BiasLabel;
  score: number;
  confidence: "low" | "medium" | "high";
  reason: string;
  tradeAllowed: boolean;
  updatedAt: string;
  drivers?: BrainDriver[];
}

export interface PostMortem {
  tag:
    | "stop_too_tight"
    | "wrong_regime"
    | "event_risk"
    | "bias_flip"
    | "good_loss"
    | "target_hit"
    | "manual";
  summary: string;
  lesson: string;
  analyzedAt: string;
  /** LLM narrative — structured tag stays rule-based. */
  narrative?: string;
  mode?: "llm" | "rule";
}

export interface Signal {
  id: string;
  asset: Asset;
  mode: SignalMode;
  direction: Direction;
  status: SignalStatus;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  openedAt: string;
  closedAt?: string;
  exitPrice?: number;
  rrPlanned: number;
  rrAchieved?: number;
  brainLabel: string;
  brainScore: number;
  brainConfidence: string;
  thesis: string;
  postMortem?: PostMortem;
  /** Audit trail — brain state captured at open/close for post-mortem integrity. */
  brainAtOpen?: BrainSnapshot;
  brainAtClose?: BrainSnapshot;
  /** e.g. "yahoo:GC=F" — where entry/exit prices came from. */
  marketSource?: string;
  generationJobId?: string;
}

export interface DeskStats {
  totalClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgR: number | null;
  expectancy: number | null;
}
