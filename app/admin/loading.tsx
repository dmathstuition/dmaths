export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-8 w-56 rounded-lg bg-ink/10" />
        <div className="mt-2 h-4 w-36 rounded bg-ink/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5">
            <div className="h-3 w-24 rounded bg-ink/8" />
            <div className="mt-3 h-8 w-14 rounded bg-ink/10" />
          </div>
        ))}
      </div>
      <div className="card p-6 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-32 rounded bg-ink/8" />
            <div className="h-4 w-20 rounded bg-ink/5" />
            <div className="h-4 w-16 rounded bg-ink/5 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
