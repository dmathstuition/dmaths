import Logo from "@/components/Logo";

export const metadata = { title: "You're offline — D-Maths Tuition Centre" };

// Shown by the service worker when a page is requested with no connection.
// Mirrors the branded shell of not-found.tsx / error.tsx.
export default function Offline() {
  return (
    <main className="boardgrid flex min-h-screen flex-col items-center justify-center bg-board p-6 text-center text-white">
      <Logo light size="lg" />
      <p className="mt-8 font-display text-5xl font-extrabold text-gold">Offline</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">No internet connection</h1>
      <p className="mt-2 max-w-sm text-sm text-white/55">
        You're not connected right now. Check your network and try again — your
        D-Maths portal will be here when you're back online.
      </p>
      <a
        href="/"
        className="btn-gold mt-8 !rounded-full !px-6"
      >
        Try again
      </a>
    </main>
  );
}
