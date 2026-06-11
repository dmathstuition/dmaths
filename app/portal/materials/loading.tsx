export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-48 rounded-lg bg-ink/10" />
      <div className="h-4 w-36 rounded bg-ink/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i=><div key={i} className="card p-5"><div className="h-3 w-20 rounded bg-ink/8"/><div className="mt-3 h-8 w-12 rounded bg-ink/10"/></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6 h-64 bg-ink/5 rounded-2xl"/>
        <div className="card p-6 h-64 bg-ink/5 rounded-2xl"/>
      </div>
    </div>
  );
}
