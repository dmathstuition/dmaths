export default function SubpageLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div>
        <div className="h-8 w-64 rounded-lg bg-ink/10" />
        <div className="mt-2 h-4 w-44 rounded bg-ink/5" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 w-24 rounded-full bg-ink/8" />
        ))}
        <div className="ml-auto h-10 w-48 rounded-xl bg-ink/5" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="card border-l-4 border-l-ink/10 p-6 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-ink/10" />
              <div className="h-3 w-56 rounded bg-ink/5" />
            </div>
            <div className="h-6 w-16 rounded-full bg-ink/8" />
          </div>
          <div className="grid grid-cols-4 gap-3 pt-3 border-t border-line">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="space-y-1">
                <div className="h-2.5 w-14 rounded bg-ink/5" />
                <div className="h-4 w-20 rounded bg-ink/8" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
