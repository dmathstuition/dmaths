import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";

export const metadata = {
  title: "Unsubscribed — D-Maths Blog",
  robots: { index: false },
  alternates: { canonical: "/blog/unsubscribe" },
};

export default function UnsubscribedPage() {
  return (
    <MarketingShell>
      <PageHeader eyebrow="Newsletter" title="You've been unsubscribed"
        lead="You won't receive any more blog update emails from us. You can re-subscribe any time from the blog." />
      <section className="mx-auto max-w-2xl px-5 py-14 text-center">
        <Link href="/blog" className="btn-gold !min-h-[48px] !rounded-full !px-8">Back to the blog</Link>
      </section>
    </MarketingShell>
  );
}
