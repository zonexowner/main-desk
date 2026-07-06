/**
 * Skip slow Yahoo / Gold Desk fetches in dev unless DESK_LIVE_MARKETS=true.
 * NEVER active in production builds — prod is always live, no fallback prices.
 * Local live data: `npm run dev:live`.
 */
export function isDeskFastMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DESK_LIVE_MARKETS !== "true"
  );
}
