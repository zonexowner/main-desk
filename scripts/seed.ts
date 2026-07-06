/**
 * Dev-only seed — inserts example paper signals so the UI has something to
 * render locally. NEVER runs automatically; production data comes exclusively
 * from the live signal pipeline.
 *
 *   npm run seed          (requires DATABASE_URL in .env.local)
 */
import "dotenv/config";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { SEED_SIGNALS } from "../src/lib/demo/seed-signals";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is required. Copy .env.example to .env.local and set your Neon URL.",
    );
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("Refusing to seed a production environment.");
    process.exit(1);
  }

  const db = drizzle(neon(url), { schema });

  for (const s of SEED_SIGNALS) {
    await db
      .insert(schema.signals)
      .values({
        id: s.id,
        asset: s.asset,
        mode: s.mode,
        direction: s.direction,
        status: s.status,
        entry: s.entry,
        stop: s.stop,
        target1: s.target1,
        target2: s.target2,
        openedAt: new Date(s.openedAt),
        closedAt: s.closedAt ? new Date(s.closedAt) : undefined,
        exitPrice: s.exitPrice,
        rrPlanned: s.rrPlanned,
        rrAchieved: s.rrAchieved,
        brainLabel: s.brainLabel,
        brainScore: s.brainScore,
        brainConfidence: s.brainConfidence,
        thesis: s.thesis,
        postMortem: s.postMortem,
        marketSource: "seed:script",
      })
      .onConflictDoNothing();
    console.log(`Seeded ${s.id} (${s.asset} ${s.status})`);
  }

  console.log(`Done — ${SEED_SIGNALS.length} seed signals (marketSource=seed:script).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
