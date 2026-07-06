import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { TickerStrip, TickerStripSkeleton } from "@/components/TickerStrip";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Main Desk — BTC · XAUUSD signals",
  description:
    "Bias brains generate paper swing signals with targets and stops. Post-mortem every loss to improve RR and win rate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-bg ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#07090d" />
        <style
          dangerouslySetInnerHTML={{
            __html:
              ":root{color-scheme:dark}html,body{background-color:#07090d;color:#e6ebf2}",
          }}
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex min-h-12 max-w-6xl flex-wrap items-center gap-3 px-5 py-2 sm:gap-6 sm:py-0">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="block h-2 w-2 bg-accent" aria-hidden />
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">
                Main Desk
              </span>
            </Link>
            <div className="flex items-center gap-1 border-l border-border pl-4 sm:pl-6">
              <Link href="/track-record" className="nav-link">
                Track record
              </Link>
              <Link href="/pro" className="nav-link">
                Pro
              </Link>
            </div>
            <div className="ml-auto">
              <Suspense fallback={<TickerStripSkeleton />}>
                <TickerStrip />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl border-t border-border px-5 py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
            <p>
              Paper signals only — not financial advice. Losses get
              post-mortems; weights tune over time.
            </p>
            <p className="font-mono text-[11px] text-faint">
              XAU via COMEX GC=F · BTC via Yahoo BTC-USD · quotes cached 60s
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
