export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-48 rounded-lg bg-ink/10" />
      <div className="flex gap-3"><div className="h-10 flex-1 rounded-xl bg-ink/5" /><div className="h-10 w-28 rounded-xl bg-ink/8" /></div>
      <div className="card overflow-hidden">
        <div className="h-10 bg-ink/5" />
        {[1,2,3,4,5].map(i=><div key={i} className="flex gap-4 border-t border-line px-5 py-4">
          <div className="h-4 w-32 rounded bg-ink/8"/><div className="h-4 w-20 rounded bg-ink/5"/>
          <div className="h-4 w-16 rounded bg-ink/5 ml-auto"/>
        </div>)}
      </div>
    </div>
  );
}
