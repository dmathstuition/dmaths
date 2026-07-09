import LegalPage, { H2 } from "@/components/LegalPage";
import { campStartLabel } from "@/lib/summerCamp";

export const metadata = { title: "Payment & Refund Policy — D-Maths Tuition Centre", alternates: { canonical: "/refunds" } };

export default function RefundsPage() {
  return (
    <LegalPage title="Payment & Refund Policy" updated="June 2026">
      <p>
        This policy explains how payments and refunds work for D-Maths Tuition Centre. Please read
        it before making any payment.
      </p>

      <H2>Making payments</H2>
      <p>
        You can pay by bank transfer or Opay to the accounts we provide at enrolment, or online by
        card or bank through our payment processor, Paystack. For bank/Opay transfers, include the
        payment reference we ask for so we can match your payment to your application. Always
        confirm the account details with us directly — we are not responsible for funds sent to
        incorrect or fraudulent accounts.
      </p>

      <H2>Part payment (deposit)</H2>
      <p>
        Some programmes let you pay a deposit (for example 50%) to secure a place, with the balance
        due as arranged with us. A deposit is <strong>non-refundable</strong>: if you cancel, the
        deposit is not returned, and the balance only becomes payable if you proceed. Access may
        begin once the deposit is confirmed.
      </p>

      <H2>When access begins</H2>
      <p>
        Once we confirm your payment (online card/bank payments are verified automatically;
        transfers are confirmed by us), your account is created and login details are sent by
        email. Access to classes and materials begins from that point.
      </p>

      <H2>Summer Camp &amp; fixed programmes</H2>
      <p>
        For fixed programmes such as the D-Maths Online Summer Camp (starts{" "}
        <strong>{campStartLabel()}</strong>): if you cancel
        <strong> before the programme's start date</strong>, you receive a full refund of amounts
        paid, less any non-refundable deposit. <strong>Once the programme has started, fees are
        non-refundable</strong>, as your place can no longer be offered to someone else.
      </p>

      <H2>Ongoing tuition refunds</H2>
      <p>
        For rolling/ongoing tuition (outside a fixed programme), contact us at
        dmathstuition@gmail.com. Refunds, where granted, are calculated on a pro-rata basis for
        unused tuition and exclude any non-refundable deposit or administrative charges disclosed
        at sign-up. Refunds are not available once a substantial portion of a paid tuition period
        has been delivered.
      </p>

      <H2>Cancellation</H2>
      <p>
        A guardian may cancel enrolment at any time by contacting us. Cancellation stops future
        billing; any refund for the current period is handled as described above.
      </p>

      <H2>Failed or duplicate payments</H2>
      <p>
        If you are charged twice or a payment fails after funds leave your account, contact us with
        the transaction reference and we will verify and resolve it promptly. Online payments are
        verified with Paystack before any enrolment is confirmed.
      </p>

      <H2>Contact</H2>
      <p>dmathstuition@gmail.com</p>
    </LegalPage>
  );
}
