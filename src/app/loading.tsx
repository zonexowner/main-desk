export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="panel space-y-3 p-5">
        <div className="skeleton skeleton-shimmer h-3 w-48" />
        <div className="skeleton skeleton-shimmer h-7 w-72 max-w-full" />
        <div className="skeleton skeleton-shimmer h-3 w-full max-w-md" />
      </div>
      <div className="skeleton skeleton-shimmer h-[72px] w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="skeleton skeleton-shimmer h-36" />
        <div className="skeleton skeleton-shimmer h-36" />
      </div>
      <div className="skeleton skeleton-shimmer h-44 w-full" />
    </div>
  );
}
