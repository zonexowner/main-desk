-- Main Desk phase 2–5 tables (run once on Neon; idempotent)

-- Signal audit fields (brain snapshot at open/close, price provenance, job id)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS brain_at_open jsonb;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS brain_at_close jsonb;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS market_source text;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS generation_job_id text;

-- Job execution audit log (powers /api/health lastJob)
CREATE TABLE IF NOT EXISTS job_runs (
  id text PRIMARY KEY,
  job text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  result jsonb
);

CREATE TABLE IF NOT EXISTS brain_tuning (
  id text PRIMARY KEY DEFAULT 'global',
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_subscriptions (
  clerk_user_id text PRIMARY KEY,
  status text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
