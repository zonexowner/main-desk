import { computeDeskStats, listSignals } from "@/lib/services/signal-store";
import type { DeskStats, Signal } from "@/lib/types";

export interface TrackRecordPayload {
  closed: Signal[];
  stats: DeskStats;
  deskStartedAt: string | null;
}

/** Closed trades only — rows with a logged exit price and close timestamp. */
export async function getTrackRecord(): Promise<TrackRecordPayload> {
  const all = await listSignals();
  // tp1 rows are still running toward T2 — they stay out until fully closed.
  const closed = all
    .filter(
      (s) =>
        (s.status === "stopped" || s.status === "tp2" || s.status === "closed") &&
        s.exitPrice != null &&
        s.closedAt != null,
    )
    .sort((a, b) => +new Date(b.closedAt!) - +new Date(a.closedAt!));

  const deskStartedAt = all.length
    ? all.reduce(
        (min, s) => (s.openedAt < min ? s.openedAt : min),
        all[0].openedAt,
      )
    : null;

  return {
    closed,
    stats: computeDeskStats(closed),
    deskStartedAt,
  };
}

export function trackRecordCsv(closed: Signal[]): string {
  const header = [
    "id",
    "asset",
    "mode",
    "direction",
    "status",
    "entry",
    "stop",
    "target1",
    "target2",
    "exit_price",
    "rr_planned",
    "rr_achieved",
    "opened_at",
    "closed_at",
    "brain_label",
    "brain_score",
    "brain_confidence",
    "post_mortem_tag",
    "market_source",
  ].join(",");

  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = closed.map((s) =>
    [
      s.id,
      s.asset,
      s.mode,
      s.direction,
      s.status,
      s.entry,
      s.stop,
      s.target1,
      s.target2,
      s.exitPrice,
      s.rrPlanned,
      s.rrAchieved,
      s.openedAt,
      s.closedAt,
      s.brainLabel,
      s.brainScore,
      s.brainConfidence,
      s.postMortem?.tag,
      s.marketSource,
    ]
      .map(esc)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
