export const metadata = { title: "Parent Portal · D-Maths Tuition" };

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-chalk">
      <header className="border-b border-line bg-white px-6 py-4">
        <p className="font-display text-lg font-semibold text-ink">D-Maths Tuition <span className="ml-2 text-xs font-normal text-ink/40">Parent View</span></p>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
