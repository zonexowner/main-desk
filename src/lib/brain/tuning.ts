import {
  DEFAULT_BRAIN_TUNING,
  getBrainTuning,
  saveBrainTuning,
  type BrainTuningConfig,
} from "@/lib/brain/brain-config";
import { listSignals } from "@/lib/services/signal-store";
import type { PostMortem, Signal } from "@/lib/types";

export interface TuneResult {
  ok: boolean;
  sampleSize: number;
  tagCounts: Record<string, number>;
  config: BrainTuningConfig;
  adjustments: string[];
  skippedReason?: string;
}

const MIN_SAMPLE = 5;

function tagShare(
  stopped: Signal[],
  tag: PostMortem["tag"],
): number {
  if (!stopped.length) return 0;
  const n = stopped.filter((s) => s.postMortem?.tag === tag).length;
  return n / stopped.length;
}

function wins(stopped: Signal[]): Signal[] {
  return stopped.filter((s) => (s.rrAchieved ?? 0) > 0);
}

/** Adjust thresholds from tagged stop-loss history. */
export async function tuneBrainsFromHistory(): Promise<TuneResult> {
  const all = await listSignals();
  const stopped = all.filter(
    (s) => s.status === "stopped" && s.postMortem,
  ) as Array<Signal & { postMortem: PostMortem }>;

  const tagCounts: Record<string, number> = {};
  for (const s of stopped) {
    const t = s.postMortem.tag;
    tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }

  const config = await getBrainTuning();
  const adjustments: string[] = [...config.adjustments].slice(-4);

  if (stopped.length < MIN_SAMPLE) {
    return {
      ok: true,
      sampleSize: stopped.length,
      tagCounts,
      config,
      adjustments,
      skippedReason: `Need ≥${MIN_SAMPLE} stopped trades with post-mortems (have ${stopped.length}).`,
    };
  }

  const tightShare = tagShare(stopped, "stop_too_tight");
  const regimeShare = tagShare(stopped, "wrong_regime");
  const flipShare = tagShare(stopped, "bias_flip");
  const winRate = wins(stopped).length / stopped.length;

  if (tightShare > 0.35 && config.atrStopMult < 1.8) {
    config.atrStopMult = Math.round((config.atrStopMult + 0.1) * 10) / 10;
    adjustments.push(
      `Widened ATR stop to ${config.atrStopMult}× (${Math.round(tightShare * 100)}% stop_too_tight).`,
    );
  }

  if (regimeShare > 0.35 && config.xauMinScore < 5) {
    config.xauMinScore += 1;
    config.btcTradeMinScore = Math.min(config.btcTradeMinScore + 1, 4);
    adjustments.push(
      `Raised min conviction (XAU ${config.xauMinScore}, BTC trade ${config.btcTradeMinScore}).`,
    );
  }

  if (flipShare > 0.3) {
    adjustments.push(
      `${Math.round(flipShare * 100)}% bias_flip — consider tighter exit when brain crosses zero.`,
    );
  }

  if (winRate >= 0.45 && config.rrT2 < 3) {
    config.rrT2 = Math.round((config.rrT2 + 0.25) * 100) / 100;
    adjustments.push(`Win rate ${Math.round(winRate * 100)}% — nudged T2 to ${config.rrT2}R.`);
  }

  if (winRate < 0.3 && config.btcTradeMinScore < 4) {
    config.btcTradeMinScore += 1;
    adjustments.push(
      `Low win rate ${Math.round(winRate * 100)}% — BTC trade gate → ${config.btcTradeMinScore}.`,
    );
  }

  config.adjustments = adjustments.slice(-6);
  config.lastTunedAt = new Date().toISOString();

  const saved = await saveBrainTuning(config);

  return {
    ok: true,
    sampleSize: stopped.length,
    tagCounts,
    config: saved,
    adjustments: saved.adjustments,
  };
}

export async function resetBrainTuning(): Promise<BrainTuningConfig> {
  return saveBrainTuning({ ...DEFAULT_BRAIN_TUNING });
}
