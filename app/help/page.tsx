import LegalPage, { H2 } from "@/components/LegalPage";
import { FAQS } from "@/lib/faq";

export const metadata = { title: "Help & FAQ — D-Maths Tuition Centre", alternates: { canonical: "/help" } };

export default function HelpPage() {
  return (
    <LegalPage title="Help & FAQ" updated="September 2026">
      <p>
        Quick answers to the most common questions. Can&apos;t find what you need?
        Email <a href="mailto:support@dmaths.academy" className="font-semibold text-gold-deep underline">support@dmaths.academy</a>{" "}
        or message us on WhatsApp at +234 70 2567 4894.
      </p>

      {FAQS.map((f) => (
        <div key={f.id}>
          <H2>{f.q}</H2>
          <p>{f.a}</p>
        </div>
      ))}

      <H2>Still need help?</H2>
      <p>
        Email <a href="mailto:support@dmaths.academy" className="font-semibold text-gold-deep underline">support@dmaths.academy</a>{" "}
        and we&apos;ll get back to you within 24 hours.
      </p>
    </LegalPage>
  );
}
