import { getBrainTuning } from "@/lib/brain/brain-config";
import { isDeskFastMode } from "@/lib/dev/fast-mode";
import type { BiasLabel, BrainSnapshot } from "@/lib/types";

export interface BiasComponents {
  realYieldChange24h: number;
  dxyChange24h: number;
  fedCutProb: number;
  narrativeWeight: number;
  riskTone: "risk-on" | "risk-off" | "neutral";
}

export function computeXauBias(
  components: BiasComponents,
  tier1Within2h = false,
  minScore = 3,
): Omit<BrainSnapshot, "asset" | "updatedAt"> {
  const scores = {
    realYield: scoreBand(components.realYieldChange24h, -0.08, -0.03, 0.03, 0.08),
    dxy: scoreBand(components.dxyChange24h, -0.4, -0.15, 0.15, 0.4),
    fed: scoreBand(components.fedCutProb, 0.65, 0.5, 0.35, 0.25, true),
    // Higher narrative weight = supportive → inverted band.
    narratives: scoreBand(components.narrativeWeight, 3, 1, -1, -3, true),
    risk: components.riskTone === "risk-off" ? 1 : components.riskTone === "risk-on" ? -1 : 0,
  };

  const score = Object.values(scores).reduce((a, b) => a + b, 0);
  let label: BiasLabel =
    score >= 3 ? "Gold supportive" : score <= -3 ? "Gold headwind" : "Mixed / range-bound";
  let reason = `Macro score ${score} from yields, USD, Fed path, narratives, risk tone.`;
  let tradeAllowed = Math.abs(score) >= minScore;

  if (tier1Within2h) {
    label = "Event-driven (wait)";
    reason = "Tier-1 event window — no new swing entries until after release.";
    tradeAllowed = false;
  }

  const vals = Object.values(scores);
  const confidence =
    vals.filter((s) => s > 0).length >= 4 ? "high"
    : vals.filter((s) => s !== 0).length >= 3 ? "medium"
    : "low";

  return { label, score, confidence, reason, tradeAllowed };
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

export async function fetchGoldDeskBias(): Promise<Partial<BiasComponents> | null> {
  if (isDeskFastMode()) return null;

  const base =
    process.env.GOLD_DESK_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3003" : null);
  if (!base) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/bias/current`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      components?: Partial<BiasComponents & { scores?: unknown }>;
      realYieldChange24h?: number;
      dxyChange24h?: number;
      fedCutProb?: number;
      narrativeWeight?: number;
      riskTone?: BiasComponents["riskTone"];
    };
    if (data.components) return data.components;
    return {
      realYieldChange24h: data.realYieldChange24h,
      dxyChange24h: data.dxyChange24h,
      fedCutProb: data.fedCutProb,
      narrativeWeight: data.narrativeWeight,
      riskTone: data.riskTone,
    };
  } catch {
    return null;
  }
}

export async function getXauBrain(): Promise<BrainSnapshot> {
  const [fromDesk, tuning] = await Promise.all([
    fetchGoldDeskBias(),
    getBrainTuning(),
  ]);
  const components: BiasComponents = {
    realYieldChange24h: fromDesk?.realYieldChange24h ?? -0.04,
    dxyChange24h: fromDesk?.dxyChange24h ?? -0.2,
    fedCutProb: fromDesk?.fedCutProb ?? 0.55,
    narrativeWeight: fromDesk?.narrativeWeight ?? 1,
    riskTone: fromDesk?.riskTone ?? "neutral",
  };

  const brain = computeXauBias(components, false, tuning.xauMinScore);
  return {
    asset: "XAUUSD",
    ...brain,
    updatedAt: new Date().toISOString(),
  };
}
