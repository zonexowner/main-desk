"use client";

import type { BrainSnapshot } from "@/lib/types";

const tone: Record<string, string> = {
  "Gold supportive": "text-up",
  "Gold headwind": "text-down",
  "Mixed / range-bound": "text-muted",
  "Event-driven (wait)": "text-info",
  "BTC bullish": "text-up",
  "BTC bearish": "text-down",
  "BTC neutral": "text-muted",
};

/** Score visual: -6..+6 mapped onto a centered bar. */
function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(-6, Math.min(6, score));
  const pct = (Math.abs(clamped) / 6) * 50;
  const positive = clamped >= 0;
  return (
    <div className="level-track !h-1.5 w-full">
      <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-y-1/2 bg-border2" />
      <span
        className={`absolute inset-y-0 rounded-full ${
          positive ? "bg-up" : "bg-down"
        }`}
        style={
          positive
            ? { left: "50%", width: `${pct}%` }
            : { right: "50%", width: `${pct}%` }
        }
      />
    </div>
  );
}

export function BrainPanel({ brains }: { brains: BrainSnapshot[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {brains.map((b) => (
        <div key={b.asset} className="panel panel-interactive p-4">
          <div className="flex items-center justify-between">
            <span className="microlabel">{b.asset} brain</span>
            <span
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
                b.tradeAllowed ? "text-up" : "text-faint"
              }`}
            >
              <span className={b.tradeAllowed ? "live-dot" : ""}>
                {b.tradeAllowed ? "●" : "○"}
              </span>
              {b.tradeAllowed ? "Signals on" : "Wait"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <p
              className={`text-[17px] font-semibold tracking-tight ${tone[b.label] ?? "text-muted"}`}
            >
              {b.label}
            </p>
            <p className="font-mono text-[13px] tabular-nums text-muted">
              {b.score >= 0 ? "+" : ""}
              {b.score} · {b.confidence}
            </p>
          </div>

          <div className="mt-2.5">
            <ScoreBar score={b.score} />
          </div>

          {b.drivers && b.drivers.length > 0 ? (
            <details className="mt-3">
              <summary className="microlabel rounded-[4px] px-1 py-0.5 hover:bg-surface2 hover:text-ink">
                <span className="disclosure-caret mr-1">▸</span>
                {b.drivers.length} drivers
              </summary>
              <ul className="mt-2.5 space-y-1.5 border-t border-border pt-2.5 text-xs text-muted">
                {b.drivers.map((d) => (
                  <li key={d.name} className="flex justify-between gap-2">
                    <span>{d.name}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      <span
                        className={
                          d.score > 0
                            ? "text-up"
                            : d.score < 0
                              ? "text-down"
                              : "text-faint"
                        }
                      >
                        {d.score >= 0 ? "+" : ""}
                        {d.score}
                      </span>
                      <span className="ml-2 text-faint">{d.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-muted">{b.reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
