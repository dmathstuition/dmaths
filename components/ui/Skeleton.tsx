// Shimmer skeleton primitives for route-level loading.tsx files, so pages show
// content-shaped placeholders instead of a blank flash. Theme-aware + reduced-
// motion-safe (styles live in globals.css under `.skeleton`).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

// A page-shaped placeholder. `variant` picks a common layout:
//  • cards  — a hero + a row of stat cards (dashboards)
//  • detail — a sidebar + content column (profile / student detail)
//  • list   — a hero + a stack of rows (tables / lists) [default]
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "cards" | "detail" }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading…">
      <Skeleton className="h-24 rounded-2xl sm:h-28" />

      {variant === "cards" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-56" /><Skeleton className="h-56" />
          </div>
        </>
      )}

      {variant === "detail" && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-72" />
          <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        </div>
      )}

      {variant === "list" && (
        <div className="card space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}
    </div>
  );
}
