import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!db) {
    db = drizzle(neon(url), { schema });
  }
  return db;
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
