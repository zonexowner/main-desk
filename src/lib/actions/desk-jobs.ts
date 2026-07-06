"use server";

import { canRunJobs, getUserAccess } from "@/lib/auth/access";
import {
  generatePaperSignals,
  updateRunningSignals,
} from "@/lib/services/signal-engine";

export type DeskJobResult =
  | {
      ok: true;
      kind: "generate";
      created: number;
      skipped: string[];
      message: string;
    }
  | {
      ok: true;
      kind: "update";
      updated: number;
      message: string;
    }
  | { ok: false; error: string };

export async function runGenerateSignalsAction(): Promise<DeskJobResult> {
  const access = await getUserAccess();
  if (!canRunJobs(access)) {
    return { ok: false, error: "Pro required to run signal jobs." };
  }

  try {
    const { created, skipped } = await generatePaperSignals();
    const message =
      created.length > 0
        ? `Created ${created.length} signal(s)`
        : skipped.join("; ") || "No new signals";
    return {
      ok: true,
      kind: "generate",
      created: created.length,
      skipped,
      message,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generate failed";
    return { ok: false, error: msg };
  }
}

export async function runUpdateSignalsAction(): Promise<DeskJobResult> {
  const access = await getUserAccess();
  if (!canRunJobs(access)) {
    return { ok: false, error: "Pro required to run signal jobs." };
  }

  try {
    const updated = await updateRunningSignals();
    return {
      ok: true,
      kind: "update",
      updated,
      message: `Updated ${updated} signal(s)`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return { ok: false, error: msg };
  }
}
