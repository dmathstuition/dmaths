import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata = { title: "Payment & Refund Policy — D-Maths Tuition Centre" };

export default function RefundsPage() {
  return (
    <LegalPage title="Payment & Refund Policy" updated="June 2026">
      <p>
        This policy explains how payments and refunds work for D-Maths Tuition Centre. Please read
        it before making any payment.
      </p>

      <H2>Making payments</H2>
      <p>
        Payments are made directly to the bank or Opay accounts we provide at enrolment. When
        paying, include the payment reference we ask for so we can match your payment to your
        application. Always confirm the account details with us directly — we are not responsible
        for funds sent to incorrect or fraudulent accounts.
      </p>

      <H2>When access begins</H2>
      <p>
        Once we confirm your payment, your student account is created and login details are sent
        by email. Access to classes and materials begins from that point.
      </p>

      <H2>Refunds</H2>
      <p>
        If you wish to request a refund, contact us at dmathstuition@gmail.com. Refund eligibility
        depends on how much of the tuition period or service has been used at the time of the
        request. Refunds, where granted, are calculated on a pro-rata basis for unused tuition and
        exclude any non-refundable enrolment or administrative charges disclosed at sign-up.
        Refunds are not available once a substantial portion of a paid tuition period has been
        delivered.
      </p>

      <H2>Cancellation</H2>
      <p>
        A guardian may cancel enrolment at any time by contacting us. Cancellation stops future
        billing; any refund for the current period is handled as described above.
      </p>

      <H2>Failed or duplicate payments</H2>
      <p>
        If you are charged twice or a payment fails after funds leave your account, contact us with
        the transaction reference and we will verify and resolve it promptly.
      </p>

      <H2>Contact</H2>
      <p>dmathstuition@gmail.com</p>
    </LegalPage>
  );
}
