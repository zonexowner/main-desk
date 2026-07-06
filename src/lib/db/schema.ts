import {
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { BrainSnapshot, PostMortem } from "@/lib/types";

export const assetEnum = pgEnum("asset", ["XAUUSD", "BTCUSD"]);
export const directionEnum = pgEnum("direction", ["long", "short"]);
export const modeEnum = pgEnum("signal_mode", ["swing", "day"]);
export const statusEnum = pgEnum("signal_status", [
  "running",
  "stopped",
  "tp1",
  "tp2",
  "closed",
  "expired",
]);

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  asset: assetEnum("asset").notNull(),
  mode: modeEnum("mode").notNull(),
  direction: directionEnum("direction").notNull(),
  status: statusEnum("status").notNull().default("running"),
  entry: real("entry").notNull(),
  stop: real("stop").notNull(),
  target1: real("target1").notNull(),
  target2: real("target2").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  exitPrice: real("exit_price"),
  rrPlanned: real("rr_planned").notNull(),
  rrAchieved: real("rr_achieved"),
  brainLabel: text("brain_label").notNull(),
  brainScore: real("brain_score").notNull(),
  brainConfidence: text("brain_confidence").notNull(),
  thesis: text("thesis").notNull(),
  postMortem: jsonb("post_mortem").$type<PostMortem>(),
  brainAtOpen: jsonb("brain_at_open").$type<BrainSnapshot>(),
  brainAtClose: jsonb("brain_at_close").$type<BrainSnapshot>(),
  marketSource: text("market_source"),
  generationJobId: text("generation_job_id"),
});

/** Audit log of job executions — powers /api/health lastJob. */
export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  result: jsonb("result").$type<Record<string, unknown>>(),
});

export const brainTuning = pgTable("brain_tuning", {
  id: text("id").primaryKey().default("global"),
  config: jsonb("config").notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const proSubscriptions = pgTable("pro_subscriptions", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  status: text("status").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
