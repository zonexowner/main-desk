import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db";
import { brainTuning } from "@/lib/db/schema";

export interface BrainTuningConfig {
  xauMinScore: number;
  btcMinScore: number;
  btcTradeMinScore: number;
  atrStopMult: number;
  rrT1: number;
  rrT2: number;
  lastTunedAt: string | null;
  adjustments: string[];
}

export const DEFAULT_BRAIN_TUNING: BrainTuningConfig = {
  xauMinScore: 3,
  btcMinScore: 2,
  btcTradeMinScore: 2,
  atrStopMult: 1.2,
  rrT1: 1.5,
  rrT2: 2.5,
  lastTunedAt: null,
  adjustments: [],
};

let memoryConfig: BrainTuningConfig = { ...DEFAULT_BRAIN_TUNING };

export async function getBrainTuning(): Promise<BrainTuningConfig> {
  const db = getDb();
  if (db && isDbConfigured()) {
    try {
      const [row] = await db
        .select()
        .from(brainTuning)
        .where(eq(brainTuning.id, "global"))
        .limit(1);
      if (row?.config) {
        memoryConfig = { ...DEFAULT_BRAIN_TUNING, ...row.config };
      }
    } catch {
      /* table may not exist yet */
    }
  }
  return { ...memoryConfig };
}

export async function saveBrainTuning(
  config: BrainTuningConfig,
): Promise<BrainTuningConfig> {
  memoryConfig = { ...config };
  const db = getDb();
  if (db && isDbConfigured()) {
    try {
      await db
        .insert(brainTuning)
        .values({
          id: "global",
          config: memoryConfig as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: brainTuning.id,
          set: {
            config: memoryConfig as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });
    } catch {
      /* memory-only fallback */
    }
  }
  return { ...memoryConfig };
}
