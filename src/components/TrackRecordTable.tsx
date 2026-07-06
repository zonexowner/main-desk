import type { Signal } from "@/lib/types";

const fmtPrice = (n: number | undefined, asset: Signal["asset"]) =>
  n == null
    ? "—"
    : asset === "BTCUSD"
      ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : n.toFixed(1);

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const statusLabel: Record<string, string> = {
  stopped: "Stop",
  tp2: "T2 hit",
  closed: "Closed",
};

export function TrackRecordTable({ closed }: { closed: Signal[] }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface2/50 text-left">
            {[
              "Closed",
              "Asset",
              "Dir",
              "Entry",
              "Exit",
              "R",
              "Result",
              "Brain at open",
              "Post-mortem",
            ].map((h) => (
              <th key={h} className="microlabel whitespace-nowrap px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {closed.map((s) => {
            const r = s.rrAchieved ?? 0;
            return (
              <tr
                key={s.id}
                className="border-b border-border/60 last:border-0 hover:bg-surface2/40"
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-muted">
                  {fmtDate(s.closedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-medium">
                  {s.asset === "XAUUSD" ? "XAU" : "BTC"}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2.5 font-mono text-xs uppercase ${
                    s.direction === "long" ? "text-up" : "text-down"
                  }`}
                >
                  {s.direction}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums">
                  {fmtPrice(s.entry, s.asset)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums">
                  {fmtPrice(s.exitPrice, s.asset)}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold tabular-nums ${
                    r >= 0 ? "text-up" : "text-down"
                  }`}
                >
                  {r >= 0 ? "+" : ""}
                  {r.toFixed(1)}R
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">
                  {statusLabel[s.status] ?? s.status}
                </td>
                <td className="max-w-44 truncate px-3 py-2.5 text-xs text-muted">
                  {s.brainLabel} ({s.brainScore >= 0 ? "+" : ""}
                  {s.brainScore})
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">
                  {s.postMortem ? s.postMortem.tag.replace(/_/g, " ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
