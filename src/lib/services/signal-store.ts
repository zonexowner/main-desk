import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db";
import { jobRuns, signals } from "@/lib/db/schema";
import type { DeskStats, Signal } from "@/lib/types";

/**
 * Dev-only in-memory store. Starts EMPTY — seed data is never auto-loaded.
 * Run `npm run seed` to populate it (or the DB) with example rows in dev.
 * Anchored on globalThis so all dev route bundles share one instance.
 */
const g = globalThis as typeof globalThis & {
  __mainDeskSignals?: Signal[];
  __mainDeskJobRuns?: JobRunRecord[];
};

function memoryStore(): Signal[] {
  if (!g.__mainDeskSignals) g.__mainDeskSignals = [];
  return g.__mainDeskSignals;
}

function requireDbInProduction(): void {
  if (process.env.NODE_ENV === "production" && !isDbConfigured()) {
    throw new Error(
      "DATABASE_URL is required in production — Main Desk does not run on an in-memory store in prod.",
    );
  }
}

function rowToSignal(row: typeof signals.$inferSelect): Signal {
  return {
    id: row.id,
    asset: row.asset,
    mode: row.mode,
    direction: row.direction,
    status: row.status,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    exitPrice: row.exitPrice ?? undefined,
    rrPlanned: row.rrPlanned,
    rrAchieved: row.rrAchieved ?? undefined,
    brainLabel: row.brainLabel,
    brainScore: row.brainScore,
    brainConfidence: row.brainConfidence,
    thesis: row.thesis,
    postMortem: row.postMortem ?? undefined,
    brainAtOpen: row.brainAtOpen ?? undefined,
    brainAtClose: row.brainAtClose ?? undefined,
    marketSource: row.marketSource ?? undefined,
    generationJobId: row.generationJobId ?? undefined,
  };
}

export async function listSignals(): Promise<Signal[]> {
  requireDbInProduction();
  const db = getDb();
  if (db) {
    const rows = await db.select().from(signals).orderBy(desc(signals.openedAt));
    return rows.map(rowToSignal);
  }
  return [...memoryStore()].sort(
    (a, b) => +new Date(b.openedAt) - +new Date(a.openedAt),
  );
}

export async function getRunning(asset?: Signal["asset"]): Promise<Signal[]> {
  const all = await listSignals();
  return all.filter(
    (s) =>
      (s.status === "running" || s.status === "tp1") &&
      (!asset || s.asset === asset),
  );
}

export async function insertSignal(
  partial: Omit<Signal, "id" | "openedAt" | "status">,
): Promise<Signal> {
  requireDbInProduction();
  const signal: Signal = {
    ...partial,
    id: crypto.randomUUID(),
    openedAt: new Date().toISOString(),
    status: "running",
  };

  const db = getDb();
  if (db) {
    await db.insert(signals).values({
      id: signal.id,
      asset: signal.asset,
      mode: signal.mode,
      direction: signal.direction,
      status: signal.status,
      entry: signal.entry,
      stop: signal.stop,
      target1: signal.target1,
      target2: signal.target2,
      openedAt: new Date(signal.openedAt),
      rrPlanned: signal.rrPlanned,
      brainLabel: signal.brainLabel,
      brainScore: signal.brainScore,
      brainConfidence: signal.brainConfidence,
      thesis: signal.thesis,
      brainAtOpen: signal.brainAtOpen,
      marketSource: signal.marketSource,
      generationJobId: signal.generationJobId,
    });
    return signal;
  }

  memoryStore().unshift(signal);
  return signal;
}

export async function updateSignal(
  id: string,
  patch: Partial<Signal>,
): Promise<Signal | null> {
  requireDbInProduction();
  const db = getDb();
  if (db) {
    await db
      .update(signals)
      .set({
        status: patch.status,
        closedAt: patch.closedAt ? new Date(patch.closedAt) : undefined,
        exitPrice: patch.exitPrice,
        rrAchieved: patch.rrAchieved,
        postMortem: patch.postMortem,
        brainAtClose: patch.brainAtClose,
        marketSource: patch.marketSource,
      })
      .where(eq(signals.id, id));
    const [row] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, id))
      .limit(1);
    return row ? rowToSignal(row) : null;
  }

  const store = memoryStore();
  const idx = store.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  store[idx] = { ...store[idx], ...patch };
  return store[idx];
}

/** Dev seed helper — only called from scripts/seed.ts, never at runtime. */
export async function seedSignals(rows: Signal[]): Promise<number> {
  const db = getDb();
  if (db) {
    for (const s of rows) {
      await db
        .insert(signals)
        .values({
          id: s.id,
          asset: s.asset,
          mode: s.mode,
          direction: s.direction,
          status: s.status,
          entry: s.entry,
          stop: s.stop,
          target1: s.target1,
          target2: s.target2,
          openedAt: new Date(s.openedAt),
          closedAt: s.closedAt ? new Date(s.closedAt) : undefined,
          exitPrice: s.exitPrice,
          rrPlanned: s.rrPlanned,
          rrAchieved: s.rrAchieved,
          brainLabel: s.brainLabel,
          brainScore: s.brainScore,
          brainConfidence: s.brainConfidence,
          thesis: s.thesis,
          postMortem: s.postMortem,
          marketSource: s.marketSource ?? "seed:script",
        })
        .onConflictDoNothing();
    }
    return rows.length;
  }
  g.__mainDeskSignals = structuredClone(rows);
  return rows.length;
}

export interface JobRunRecord {
  job: string;
  ranAt: string;
  result?: Record<string, unknown>;
}

function memoryJobRuns(): JobRunRecord[] {
  if (!g.__mainDeskJobRuns) g.__mainDeskJobRuns = [];
  return g.__mainDeskJobRuns;
}

export async function recordJobRun(
  job: string,
  result: Record<string, unknown>,
): Promise<string> {
  const id = crypto.randomUUID();
  const db = getDb();
  if (db) {
    try {
      await db.insert(jobRuns).values({ id, job, ranAt: new Date(), result });
    } catch {
      /* job_runs table may not exist yet — never fail the job for audit log */
    }
    return id;
  }
  const runs = memoryJobRuns();
  runs.unshift({ job, ranAt: new Date().toISOString(), result });
  g.__mainDeskJobRuns = runs.slice(0, 50);
  return id;
}

export async function getLastJobRun(): Promise<JobRunRecord | null> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(jobRuns)
        .orderBy(desc(jobRuns.ranAt))
        .limit(1);
      if (!row) return null;
      return {
        job: row.job,
        ranAt: row.ranAt.toISOString(),
        result: row.result ?? undefined,
      };
    } catch {
      return null;
    }
  }
  return memoryJobRuns()[0] ?? null;
}

export function computeDeskStats(closed: Signal[]): DeskStats {
  // Honest stats: only trades that actually finished with a logged exit price.
  const finished = closed.filter(
    (s) =>
      (s.status === "stopped" || s.status === "tp2" || s.status === "closed") &&
      s.exitPrice != null &&
      s.closedAt != null,
  );
  const wins = finished.filter(
    (s) => (s.rrAchieved ?? 0) > 0 || s.status === "tp2",
  );
  const losses = finished.filter((s) => s.status === "stopped");
  const rs = finished
    .map((s) => s.rrAchieved ?? 0)
    .filter((r) => Number.isFinite(r));

  const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  const winRate = finished.length ? wins.length / finished.length : null;
  const expectancy =
    winRate != null && avgR != null
      ? winRate * avgR - (1 - winRate) * 1
      : null;

  return {
    totalClosed: finished.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgR,
    expectancy,
  };
}
