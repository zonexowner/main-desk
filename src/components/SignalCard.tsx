"use client";

import type { Signal } from "@/lib/types";

const fmt = (n: number, asset: Signal["asset"]) =>
  asset === "BTCUSD"
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : n.toFixed(1);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Maps a price onto the stop → T2 axis as a 0..100 percentage.
 * Stop is always 0, T2 is always 100 regardless of direction.
 */
function levelPct(signal: Signal, price: number): number {
  const { stop, target2 } = signal;
  const span = target2 - stop;
  if (span === 0) return 50;
  return Math.min(100, Math.max(0, ((price - stop) / span) * 100));
}

function LevelBar({
  signal,
  markPrice,
}: {
  signal: Signal;
  markPrice?: number;
}) {
  const entryPct = levelPct(signal, signal.entry);
  const t1Pct = levelPct(signal, signal.target1);
  const markPct = markPrice != null ? levelPct(signal, markPrice) : null;
  const inProfit =
    markPrice != null &&
    (signal.direction === "long"
      ? markPrice >= signal.entry
      : markPrice <= signal.entry);

  return (
    <div className="mt-4">
      <div className="level-track">
        {markPct != null && (
          <div
            className={`absolute inset-y-0 rounded-full ${
              inProfit ? "bg-up/70" : "bg-down/70"
            }`}
            style={{
              left: `${Math.min(entryPct, markPct)}%`,
              width: `${Math.abs(markPct - entryPct)}%`,
            }}
          />
        )}
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-down"
          style={{ left: "0%" }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-faint"
          style={{ left: `${entryPct}%` }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-up/60"
          style={{ left: `${t1Pct}%` }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-up"
          style={{ left: "100%" }}
        />
        {markPct != null && (
          <span
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg ${
              inProfit ? "bg-up" : "bg-down"
            }`}
            style={{ left: `${markPct}%` }}
          />
        )}
      </div>
      <div
        className="mt-2 flex justify-between font-mono text-[11px]"
        data-num
      >
        <span className="text-down/80">SL {fmt(signal.stop, signal.asset)}</span>
        <span className="text-faint">E {fmt(signal.entry, signal.asset)}</span>
        <span className="text-up/60">T1 {fmt(signal.target1, signal.asset)}</span>
        <span className="text-up/90">T2 {fmt(signal.target2, signal.asset)}</span>
      </div>
    </div>
  );
}

export function SignalCard({
  signal,
  markPrice,
  unrealizedR,
}: {
  signal: Signal;
  markPrice?: number;
  unrealizedR?: number;
}) {
  const isLong = signal.direction === "long";
  const running = signal.status === "running" || signal.status === "tp1";
  const r = running ? unrealizedR : signal.rrAchieved;

  return (
    <article className="panel panel-interactive p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              {signal.asset}
            </span>
            <span
              className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                isLong ? "bg-up/10 text-up" : "bg-down/10 text-down"
              }`}
            >
              {signal.direction} · {signal.mode}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {signal.status === "tp1" ? "T1 hit · running" : signal.status}
            </span>
            <span className="font-mono text-[11px] text-faint" data-num>
              {fmtDate(signal.openedAt)}
              {signal.closedAt ? ` → ${fmtDate(signal.closedAt)}` : ""}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {signal.thesis}
          </p>
        </div>

        {r != null && (
          <div className="text-right">
            <div
              className={`font-mono text-[26px] font-semibold leading-none tabular-nums ${
                r >= 0 ? "text-up" : "text-down"
              }`}
            >
              {r >= 0 ? "+" : ""}
              {r.toFixed(1)}
              <span className="text-[15px]">R</span>
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              {running ? "unrealized" : "realized"} · plan {signal.rrPlanned}R
            </div>
          </div>
        )}
      </div>

      <LevelBar
        signal={signal}
        markPrice={running ? markPrice : signal.exitPrice}
      />

      <div
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 font-mono text-[11px] text-faint"
        data-num
      >
        {running && markPrice != null && (
          <span>
            mark <span className="text-muted">{fmt(markPrice, signal.asset)}</span>
          </span>
        )}
        {!running && signal.exitPrice != null && (
          <span>
            exit <span className="text-muted">{fmt(signal.exitPrice, signal.asset)}</span>
          </span>
        )}
        <span>
          brain{" "}
          <span className="text-muted">
            {signal.brainLabel} ({signal.brainScore >= 0 ? "+" : ""}
            {signal.brainScore})
          </span>
        </span>
        {signal.marketSource && (
          <span>
            src <span className="text-muted">{signal.marketSource}</span>
          </span>
        )}
      </div>

      {signal.postMortem && (
        <details className="mt-3 overflow-hidden rounded-[6px] border border-border bg-surface2 transition-colors duration-150 hover:border-border2">
          <summary className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            <span className="disclosure-caret text-faint">▸</span>
            Post-mortem · {signal.postMortem.tag.replace(/_/g, " ")}
            {signal.postMortem.mode === "llm" && (
              <span className="normal-case tracking-normal text-faint">
                · LLM narrative
              </span>
            )}
          </summary>
          <div className="border-t border-border px-3 py-2.5 text-[13px] leading-relaxed">
            <p>{signal.postMortem.summary}</p>
            {signal.postMortem.narrative && (
              <p className="mt-2 text-ink/90">{signal.postMortem.narrative}</p>
            )}
            <p className="mt-1.5 text-xs text-muted">
              {signal.postMortem.lesson}
            </p>
          </div>
        </details>
      )}
    </article>
  );
}
