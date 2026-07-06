import { getBtcBrain } from "@/lib/brain/btc-brain";
import { enrichPostMortemWithLlm } from "@/lib/brain/post-mortem-llm";
import { analyzeStopLoss, analyzeTakeProfit } from "@/lib/brain/post-mortem";
import { getXauBrain } from "@/lib/brain/xau-brain";
import type { MarketSnapshot } from "@/lib/market/quotes";
import { fetchAllMarkets, fetchMarket } from "@/lib/market/quotes";
import { buildSetup, unrealizedR } from "@/lib/setup/engine";
import {
  getRunning,
  insertSignal,
  listSignals,
  recordJobRun,
  updateSignal,
} from "@/lib/services/signal-store";
import type { Asset, BrainSnapshot, Signal } from "@/lib/types";

function unavailableBrain(asset: Asset): BrainSnapshot {
  return {
    asset,
    label: asset === "BTCUSD" ? "BTC neutral" : "Mixed / range-bound",
    score: 0,
    confidence: "low",
    reason: "Market data unavailable — live quote fetch failed.",
    tradeAllowed: false,
    updatedAt: new Date().toISOString(),
  };
}

export async function getBrains(
  markets?: Record<Asset, MarketSnapshot | null>,
): Promise<BrainSnapshot[]> {
  const m = markets ?? (await fetchAllMarkets());
  const btcMarket = m.BTCUSD;
  const [xau, btc] = await Promise.all([
    getXauBrain(),
    btcMarket
      ? getBtcBrain(btcMarket, m.XAUUSD?.change24hPct)
      : Promise.resolve(unavailableBrain("BTCUSD")),
  ]);
  return [xau, btc];
}

/** Create paper signals when brain allows and no duplicate running. */
export async function generatePaperSignals(): Promise<{
  created: Signal[];
  skipped: string[];
  jobId: string;
}> {
  const jobId = crypto.randomUUID();
  const markets = await fetchAllMarkets();
  const brains = await getBrains(markets);
  const created: Signal[] = [];
  const skipped: string[] = [];

  for (const brain of brains) {
    const market = markets[brain.asset];
    if (!market) {
      skipped.push(`${brain.asset}: market data unavailable — no signal`);
      continue;
    }
    if (process.env.NODE_ENV === "production" && !market.live) {
      skipped.push(`${brain.asset}: quote not live — refusing to open on fallback price`);
      continue;
    }
    const running = await getRunning(brain.asset);
    if (running.some((s) => s.mode === "swing")) {
      skipped.push(`${brain.asset}: swing already running`);
      continue;
    }

    const setup = await buildSetup(brain, market, "swing");
    if (setup.skipReason) {
      skipped.push(`${brain.asset}: ${setup.skipReason}`);
      continue;
    }

    const signal = await insertSignal({
      ...setup.signal,
      brainAtOpen: brain,
      marketSource: market.source,
      generationJobId: jobId,
    });
    created.push(signal);
  }

  await recordJobRun("generate-signals", {
    jobId,
    created: created.map((s) => s.id),
    skipped,
  });

  return { created, skipped, jobId };
}

function hitLevel(
  signal: Signal,
  price: number,
): "stop" | "tp1" | "tp2" | null {
  const { direction, stop, target1, target2 } = signal;
  if (direction === "long") {
    if (price <= stop) return "stop";
    if (price >= target2) return "tp2";
    if (price >= target1) return "tp1";
  } else {
    if (price >= stop) return "stop";
    if (price <= target2) return "tp2";
    if (price <= target1) return "tp1";
  }
  return null;
}

async function brainAtExit(
  signal: Signal,
  market: MarketSnapshot,
): Promise<BrainSnapshot> {
  return signal.asset === "XAUUSD" ? getXauBrain() : getBtcBrain(market);
}

/** Check live prices vs stops/targets; attach post-mortems + brain snapshot on close. */
export async function updateRunningSignals(): Promise<number> {
  const all = await listSignals();
  const active = all.filter(
    (s) => s.status === "running" || s.status === "tp1",
  );
  let updated = 0;
  const skipped: string[] = [];

  for (const signal of active) {
    const market = await fetchMarket(signal.asset);
    if (!market || (process.env.NODE_ENV === "production" && !market.live)) {
      skipped.push(`${signal.id}: no live quote — levels not checked`);
      continue;
    }
    const hit = hitLevel(signal, market.price);
    if (!hit) continue;

    if (hit === "stop") {
      const brain = await brainAtExit(signal, market);
      const rr = unrealizedR(signal, market.price);
      const base = analyzeStopLoss(signal, market.price, brain);
      const postMortem = await enrichPostMortemWithLlm(signal, base, brain);
      await updateSignal(signal.id, {
        status: "stopped",
        closedAt: new Date().toISOString(),
        exitPrice: market.price,
        rrAchieved: Math.round(rr * 10) / 10,
        postMortem,
        brainAtClose: brain,
        marketSource: market.source,
      });
      updated++;
    } else if (hit === "tp2") {
      const brain = await brainAtExit(signal, market);
      const rr = unrealizedR(signal, market.price);
      await updateSignal(signal.id, {
        status: "tp2",
        closedAt: new Date().toISOString(),
        exitPrice: market.price,
        rrAchieved: Math.round(rr * 10) / 10,
        postMortem: analyzeTakeProfit(signal, market.price, "tp2"),
        brainAtClose: brain,
        marketSource: market.source,
      });
      updated++;
    } else if (hit === "tp1" && signal.status !== "tp1") {
      await updateSignal(signal.id, {
        status: "tp1",
        exitPrice: market.price,
        rrAchieved: Math.round(unrealizedR(signal, market.price) * 10) / 10,
      });
      updated++;
    }
  }

  await recordJobRun("update-signals", { updated, checked: active.length, skipped });

  return updated;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export function partitionSignals(all: Signal[]) {
  const running = all.filter(
    (s) => s.status === "running" || s.status === "tp1",
  );
  const today = all.filter((s) => isToday(s.openedAt));
  const history = all.filter(
    (s) => s.status === "stopped" || s.status === "tp2" || s.status === "closed",
  );
  return { running, today, history };
}
