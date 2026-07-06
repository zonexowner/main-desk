"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { BrainPanel } from "@/components/BrainPanel";
import { SignalCard } from "@/components/SignalCard";
import {
  runGenerateSignalsAction,
  runUpdateSignalsAction,
} from "@/lib/actions/desk-jobs";
import type { DeskPayload } from "@/lib/services/desk-data";
import type { Signal } from "@/lib/types";

type Tab = "running" | "today" | "history";
const TAB_ORDER: Tab[] = ["running", "today", "history"];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function DeskView({ initial }: { initial: DeskPayload }) {
  const [tab, setTab] = useState<Tab>("running");
  const [data, setData] = useState<DeskPayload>(initial);
  const [jobMsg, setJobMsg] = useState<string | null>(null);
  const [jobPending, startJob] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/desk");
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last good data */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Keyboard 1/2/3 switches tabs (skipped while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx >= 0) setTab(TAB_ORDER[idx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runGenerate = () => {
    setJobMsg("Generating…");
    startJob(async () => {
      const result = await runGenerateSignalsAction();
      setJobMsg(result.ok ? result.message : result.error);
      await load();
    });
  };

  const runUpdate = () => {
    setJobMsg("Checking prices…");
    startJob(async () => {
      const result = await runUpdateSignalsAction();
      setJobMsg(result.ok ? result.message : result.error);
      await load();
    });
  };

  const isPro = data.access.tier === "pro" || !data.access.paywallActive;
  const marketsDown = data.markets.every((m) => m.price == null);
  const gatesOpen = data.brains.filter((b) => b.tradeAllowed).length;

  const tabs: { id: Tab; label: string; count: number; key: string }[] = [
    { id: "running", label: "Running", count: data.running.length, key: "1" },
    { id: "today", label: "Today", count: data.today.length, key: "2" },
    { id: "history", label: "History", count: data.history.length, key: "3" },
  ];

  const list =
    tab === "running"
      ? data.running
      : tab === "today"
        ? data.today
        : data.history;

  const emptyCopy =
    tab === "history"
      ? data.deskStartedAt
        ? `No closed trades yet — paper desk started ${fmtDate(data.deskStartedAt)}. First entry appears when a signal hits stop or target.`
        : "No closed trades yet. First signal opens when a brain gate turns on."
      : tab === "today"
        ? "No signals opened today. Generation runs daily at 09:00 UTC when a brain gate is open."
        : "No running signals. The desk opens at most one swing per asset — next check at the daily generation job.";

  return (
    <div className="space-y-6">
      <section className="panel panel-interactive flex flex-wrap items-end justify-between gap-5 border-l-[3px] border-l-accent/80 p-5">
        <div className="min-w-0 flex-1">
          <p className="microlabel">BTC · XAUUSD paper signal desk</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
            Bias brains → paper signals
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
            XAU brain pulls Gold Desk macro. BTC brain scores momentum, QQQ,
            DXY, gold sync, and risk tone. ATR stops — every loss gets a rule
            tag plus optional LLM narrative.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={runGenerate}
            disabled={jobPending}
            className="btn btn-primary btn-sm"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={runUpdate}
            disabled={jobPending}
            className="btn btn-secondary btn-sm"
          >
            Update SL·TP
          </button>
        </div>
      </section>

      {jobMsg && (
        <p className="panel px-3 py-2 font-mono text-xs text-muted">{jobMsg}</p>
      )}

      {marketsDown && (
        <p className="rounded-[6px] border border-down/40 bg-down/10 px-3 py-2 text-[13px] text-down">
          Market data unavailable — live quotes could not be fetched. No prices
          are shown rather than stale or synthetic ones.
        </p>
      )}

      {!isPro && data.paywallActive && (
        <p className="rounded-[6px] border border-accent/30 bg-accent/5 px-3 py-2 text-[13px]">
          Free preview —{" "}
          <Link href="/pro" className="btn btn-ghost btn-sm !min-h-0 !px-1 !py-0 !text-[13px] !normal-case !tracking-normal !font-sans !font-semibold !text-accent hover:!bg-transparent hover:!underline">
            Pro ${data.proPriceMonthly}/mo
          </Link>{" "}
          for full history, LLM post-mortems, and tuning insights.
        </p>
      )}

      {/* Desk status strip */}
      <section className="panel grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
        {[
          {
            l: "Brain gates",
            n: `${gatesOpen}/2 open`,
            tone: gatesOpen > 0 ? "text-up" : "text-muted",
          },
          {
            l: "Running",
            n: String(data.running.length),
            tone: "text-ink",
          },
          {
            l: "Closed trades",
            n: String(data.stats.totalClosed),
            tone: "text-ink",
          },
          {
            l: "Stop policy",
            n: data.tuning ? `${data.tuning.atrStopMult}× ATR` : "1.2× ATR",
            tone: "text-ink",
          },
        ].map((s) => (
          <div key={s.l} className="px-4 py-3">
            <p className="microlabel">{s.l}</p>
            <p
              className={`mt-1 font-mono text-[15px] font-medium tabular-nums ${s.tone}`}
            >
              {s.n}
            </p>
          </div>
        ))}
      </section>

      <BrainPanel brains={data.brains} />

      {data.tuning && data.tuning.adjustments.length > 0 && (
        <section className="panel p-4">
          <p className="microlabel">Brain tuning</p>
          <p className="mt-1.5 font-mono text-[13px] tabular-nums text-ink">
            Stop {data.tuning.atrStopMult}× ATR · XAU min |score|{" "}
            {data.tuning.xauMinScore} · BTC trade gate{" "}
            {data.tuning.btcTradeMinScore}
          </p>
          {data.tuning.lastTunedAt && (
            <p className="mt-1 text-xs text-faint">
              Last tuned {new Date(data.tuning.lastTunedAt).toLocaleString()}
            </p>
          )}
          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            {data.tuning.adjustments.slice(-3).map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
        </section>
      )}

      {data.stats.totalClosed >= 3 ? (
        <section className="panel grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {[
            { n: String(data.stats.totalClosed), l: "closed trades" },
            {
              n:
                data.stats.winRate != null
                  ? `${Math.round(data.stats.winRate * 100)}%`
                  : "—",
              l: "win rate",
            },
            {
              n:
                data.stats.avgR != null
                  ? `${data.stats.avgR >= 0 ? "+" : ""}${data.stats.avgR.toFixed(1)}R`
                  : "—",
              l: "avg R",
            },
            {
              n:
                data.stats.expectancy != null
                  ? data.stats.expectancy.toFixed(2)
                  : "—",
              l: "expectancy",
            },
          ].map((s) => (
            <div key={s.l} className="px-4 py-3">
              <p className="microlabel">{s.l}</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                {s.n}
              </p>
            </div>
          ))}
        </section>
      ) : (
        <p className="panel px-4 py-3 font-mono text-[13px] text-muted">
          Building track record ({data.stats.totalClosed}/30) —{" "}
          <Link href="/track-record" className="text-accent hover:underline">
            see every closed trade
          </Link>
        </p>
      )}

      <section>
        <div className="sticky top-12 z-10 -mx-5 border-b border-border bg-bg/95 px-5 backdrop-blur-sm">
          <div className="flex gap-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-[44px] -mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                  tab === t.id
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:border-border2 hover:text-ink"
                }`}
              >
                {t.label}
                <span className="ml-1.5 font-mono text-xs tabular-nums opacity-60">
                  {t.count}
                </span>
                <kbd className="ml-2 hidden rounded-[3px] border border-border px-1 py-px font-mono text-[10px] text-faint sm:inline">
                  {t.key}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {list.length === 0 ? (
            <p className="panel p-6 text-[13px] leading-relaxed text-muted">
              {emptyCopy}
            </p>
          ) : (
            list.map((s) => {
              const enriched = s as Signal & {
                markPrice?: number;
                unrealizedR?: number;
              };
              return (
                <SignalCard
                  key={s.id}
                  signal={s}
                  markPrice={enriched.markPrice}
                  unrealizedR={enriched.unrealizedR}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
