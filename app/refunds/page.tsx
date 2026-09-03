import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata = { title: "Payment & Refund Policy — D-Maths Tuition Centre", alternates: { canonical: "/refunds" } };

export default function RefundsPage() {
  return (
    <LegalPage title="Payment & Refund Policy" updated="September 2026">
      <p>
        This policy explains how payments and refunds work for D-Maths Tuition Centre. Please read
        it before enrolling.
      </p>

      <H2>How tuition is charged</H2>
      <p>
        Tuition is charged <strong>per hour</strong>, at the rate for the learner&apos;s class (see
        our <a href="/pricing" className="underline">pricing page</a>). We record the hours a
        learner actually attends each month and total them automatically. There is no payment at
        sign-up — billing begins once classes start.
      </p>

      <H2>Monthly billing &amp; when payment is due</H2>
      <p>
        Around three days before each month ends, we raise that month&apos;s invoice (hours
        attended × the hourly rate) and send it to the learner and their parent/guardian. Payment
        is due <strong>on or before the last day of the month</strong>. You can pay securely from
        the portal (card or bank via our processor, Paystack) or by bank transfer/Opay to the
        accounts we provide, using the reference we ask for. Always confirm account details with us
        directly — we are not responsible for funds sent to incorrect or fraudulent accounts.
      </p>

      <H2>Late or missed payments</H2>
      <p>
        If an invoice is not settled by the last day of the month, access to classes and portal
        features may be paused until the balance is cleared. We&apos;ll always remind you before
        the due date and are happy to discuss arrangements — contact us at support@dmaths.academy.
      </p>

      <H2>When access begins</H2>
      <p>
        Once we approve a registration, the learner&apos;s account is created and login details are
        sent by email. Access to classes and materials begins from that point; charges apply only
        for hours actually attended thereafter.
      </p>

      <H2>Refunds</H2>
      <p>
        Because tuition is billed in arrears for hours already attended, there is normally nothing
        to refund. If you are charged for a session the learner did not attend, or an invoice looks
        wrong, contact us at support@dmaths.academy with the details and we will verify and correct
        it promptly. Any refund granted excludes administrative charges disclosed at sign-up.
      </p>

      <H2>Cancellation</H2>
      <p>
        A guardian may stop tuition at any time by contacting us. You are only billed for hours
        attended up to that point; no future charges are raised once tuition is stopped.
      </p>

      <H2>Failed or duplicate payments</H2>
      <p>
        If you are charged twice or a payment fails after funds leave your account, contact us with
        the transaction reference and we will verify and resolve it promptly. Online payments are
        verified with Paystack before a receipt is issued.
      </p>

      <H2>Contact</H2>
      <p>support@dmaths.academy</p>
    </LegalPage>
  );
}
