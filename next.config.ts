import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Local Seagate dev only — Vercel must use default `.next`. */
  ...(process.env.VERCEL
    ? {}
    : { distDir: path.join(os.tmpdir(), "main-desk-next") }),
  turbopack: {
    root: appDir,
  },
};

export default nextConfig;
