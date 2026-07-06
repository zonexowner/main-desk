import Link from "next/link";
import { TrackRecordTable } from "@/components/TrackRecordTable";
import { canViewFullHistory, getUserAccess } from "@/lib/auth/access";
import { getTrackRecord } from "@/lib/services/track-record";

export const metadata = {
  title: "Track record — Main Desk",
  description:
    "Every closed paper trade with logged entry, exit, and R. No synthetic results.",
};

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default async function TrackRecordPage() {
  const [record, access] = await Promise.all([
    getTrackRecord(),
    getUserAccess(),
  ]);
  const fullAccess = canViewFullHistory(access);
  const { closed, stats, deskStartedAt } = record;
  const visible = fullAccess ? closed : closed.slice(0, 2);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="microlabel">Closed paper trades · database rows only</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
            Track record
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            Every closed paper trade, straight from the database — logged
            entry, exit price, and realized R. Nothing synthetic, nothing
            backfilled.
          </p>
        </div>
        {fullAccess && closed.length > 0 && (
          <a
            href="/api/export/track-record"
            className="btn btn-secondary btn-sm"
          >
            Export CSV ↓
          </a>
        )}
      </header>

      {stats.totalClosed >= 3 ? (
        <section className="panel grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {[
            { n: String(stats.totalClosed), l: "closed trades" },
            {
              n:
                stats.winRate != null
                  ? `${Math.round(stats.winRate * 100)}%`
                  : "—",
              l: "win rate",
            },
            {
              n:
                stats.avgR != null
                  ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(1)}R`
                  : "—",
              l: "avg R",
            },
            {
              n: stats.expectancy != null ? stats.expectancy.toFixed(2) : "—",
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
          Building track record ({stats.totalClosed}/30)
        </p>
      )}

      {closed.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-[13px] text-ink">No closed trades yet.</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            {deskStartedAt
              ? `Paper desk started ${fmtDate(deskStartedAt)}.`
              : "Paper desk has not opened its first signal yet."}{" "}
            First entry appears when a signal hits stop or target.
          </p>
        </div>
      ) : (
        <>
          <TrackRecordTable closed={visible} />
          {!fullAccess && closed.length > visible.length && (
            <p className="text-[13px] text-muted">
              {closed.length - visible.length} more closed trades —{" "}
              <Link href="/pro" className="text-accent hover:underline">
                Pro
              </Link>{" "}
              unlocks the full record.
            </p>
          )}
        </>
      )}

      <p className="text-xs text-faint">
        Paper signals only. Exit prices logged from the same quote source used
        to open the trade (Yahoo GC=F / BTC-USD).
      </p>
    </div>
  );
}
