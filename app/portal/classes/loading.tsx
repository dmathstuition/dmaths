export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl bg-ink/10 h-28" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i=><div key={i} className="card p-5"><div className="h-3 w-20 rounded bg-ink/8"/><div className="mt-3 h-8 w-12 rounded bg-ink/10"/></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 rounded bg-ink/5"/>)}</div>
        <div className="card p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 rounded bg-ink/5"/>)}</div>
      </div>
    </div>
  );
}
