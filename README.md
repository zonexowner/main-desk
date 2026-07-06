# Main Desk

**BTC + XAUUSD paper signal desk.** Bias brains generate paper swing signals with ATR stops and R-multiple targets; every loss gets a rule-tagged post-mortem; weights tune weekly from tagged history.

## Real-data guarantees

- **Live prices only.** XAU marks come from COMEX `GC=F`, BTC from Yahoo `BTC-USD`. Quotes are cached 60s in-memory with in-flight dedupe. If Yahoo is unreachable in production, the UI shows **"Market data unavailable"** — never a fallback number.
- **No seed data in production.** The in-memory store starts empty; example rows exist only behind `npm run seed` (which refuses to run against production). Production requires `DATABASE_URL` and throws loudly if it is missing.
- **Auditable lifecycle.** Every signal stores the brain snapshot at open **and** at close (`brain_at_open`, `brain_at_close`), the quote source (`market_source`, e.g. `yahoo:GC=F`), and the generation job id. Signals only open when a brain gate is on and the quote is live.
- **Honest stats.** Win rate / avg R / expectancy count only trades with status `stopped | tp2 | closed` **and** a logged exit price + close timestamp. The stats row hides until 3 closed trades ("Building track record (N/30)").
- **Paper only** until 30+ real closed paper trades — the disclaimer stays.

## Run

```bash
cd web
npm install
npm run dev        # fast mode: dev fallback quotes, no Yahoo/Gold Desk calls
npm run dev:live   # live quotes locally (DESK_LIVE_MARKETS=true)
npm run seed       # optional: example signals into Neon (dev only)
# → http://localhost:3004
```

Dev fast mode (`npm run dev`) uses labeled fallback quotes (`source: "fallback:dev"`) because the Seagate drive makes cold fetch-heavy compiles painful. Fast mode is **hard-disabled in production builds** — `DESK_LIVE_MARKETS` is effectively always true in prod.

## Architecture

| Layer | What |
|-------|------|
| **XAU Brain** | Gold Desk macro bias (yields, DXY, Fed, narratives, risk tone) |
| **BTC Brain** | 24h + 5d momentum, QQQ, DXY, gold sync, macro risk tone |
| **Setup engine** | Tunable ATR stop · T1/T2 R multiples (defaults 1.2×, 1.5R, 2.5R) |
| **Signal store** | Neon Postgres (required in prod); empty in-memory store in dev |
| **Post-mortem** | Rule tags on SL; optional LLM narrative (`OPENAI_API_KEY`) |
| **Tuning job** | Weekly adjustment from tag distribution (`/api/jobs/tune-brains`) |
| **Track record** | `/track-record` — every closed trade + CSV export (Pro) |
| **Pro gating** | `PAYWALL_ENABLED=true` limits free history; Stripe checkout at `/pro` |

## Env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon — **required in production**; signals, `job_runs`, `brain_tuning`, `pro_subscriptions` |
| `GOLD_DESK_URL` | Live XAU brain from Gold Desk (`/api/bias/current`) |
| `DESK_LIVE_MARKETS` | `true` on Vercel; only respected in dev (prod is always live) |
| `CRON_SECRET` / `APP_WRITE_TOKEN` | Auth for `/api/jobs/*` in production; Vercel cron sends `CRON_SECRET` as Bearer |
| `OPENAI_API_KEY` | LLM post-mortem narratives (tags stay rule-based) |
| `PAYWALL_ENABLED` | Enable Pro gating (default off = early access free) |
| `PRO_ALLOWLIST` | Comma-separated user ids for manual Pro (sent as `x-desk-user-id`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing once paywall is on |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` | Stripe price ids ($29/mo, $249/yr) |
| `NEXT_PUBLIC_APP_URL` | Checkout success/cancel redirect base |

## Jobs

```bash
# Dev (no token required)
curl -X POST http://localhost:3004/api/jobs/generate-signals
curl -X POST http://localhost:3004/api/jobs/update-signals
curl -X POST http://localhost:3004/api/jobs/tune-brains

# Production (Bearer token)
curl -H "Authorization: Bearer $CRON_SECRET" \
  -X POST https://your-app.vercel.app/api/jobs/update-signals
```

Vercel crons (`vercel.json`): update 3× daily (08/14/20 UTC), generate daily (09 UTC), tune weekly (Sun 07 UTC). Every run is logged to `job_runs`.

Health check: `GET /api/health` → `{ ok, db, markets, lastJob }` (503 when prod is degraded).

## Deploy

```bash
vercel link                        # project: main-desk
vercel env add DATABASE_URL
vercel env add GOLD_DESK_URL
vercel env add CRON_SECRET
vercel env add DESK_LIVE_MARKETS   # true
vercel deploy --prod
```

Then:

1. Run `scripts/migrate-phase2.sql` on Neon once (audit columns + `job_runs` + `brain_tuning` + `pro_subscriptions`). Base `signals` table comes from `npm run db:push`.
2. Smoke test: `curl https://<app>/api/health`, then each job with `Authorization: Bearer $CRON_SECRET`.

## Status

**Paper only.** Do not distribute as live trade advice until 30+ closed paper trades with logged post-mortems. Gold Desk stays macro-only; Main Desk owns signals.
