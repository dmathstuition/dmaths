export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-24 rounded bg-ink/10" />
      <div className="card p-6"><div className="h-8 w-48 rounded bg-ink/10" /><div className="mt-3 h-4 w-64 rounded bg-ink/5" /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card h-64 bg-ink/5" /><div className="card h-64 bg-ink/5" />
      </div>
    </div>
  );
}
