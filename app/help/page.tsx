import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata = { title: "Help & FAQ — D-Maths Tuition Centre" };

export default function HelpPage() {
  return (
    <LegalPage title="Help & FAQ" updated="June 2026">
      <p>
        Quick answers to the most common questions. Can't find what you need?
        Email <a href="mailto:dmathstuition@gmail.com" className="font-semibold text-gold-deep underline">dmathstuition@gmail.com</a>{" "}
        or message us on WhatsApp at +234 70 2567 4894.
      </p>

      <H2>How do I register?</H2>
      <p>
        Go to <a href="/apply" className="font-semibold text-gold-deep underline">Apply</a>, fill in the student and
        guardian details, choose your subjects (or a Summer Camp package), and make payment. Once we verify it, your
        Student ID and password are emailed to you and our team reaches out to confirm.
      </p>

      <H2>How do I pay?</H2>
      <p>
        You can pay online by card or bank through Paystack, or by bank transfer / Opay to the accounts shown at
        sign-up. For transfers, use your full name (or the reference we give) so we can match your payment.
      </p>

      <H2>Can I pay half now and the balance later?</H2>
      <p>
        For Summer Camp packages, yes — choose <strong>"Pay half now"</strong> at checkout to pay a 50% deposit and
        secure your place. The balance is arranged with our team afterwards. Deposits are non-refundable (see our
        <a href="/refunds" className="font-semibold text-gold-deep underline"> Payment &amp; Refund Policy</a>).
      </p>

      <H2>I forgot my password</H2>
      <p>
        On the <a href="/login" className="font-semibold text-gold-deep underline">Sign in</a> page, tap
        <strong> "Forgot password?"</strong>, enter your email, and follow the link we send to set a new one. (Students
        who only have a Student ID can ask us to reset it.)
      </p>

      <H2>Can parents see their child's progress?</H2>
      <p>
        Yes. If a guardian email was provided, a parent portal account is created so you can sign in and view your
        child's grades, attendance and behaviour. Don't have access yet? Ask us to set it up.
      </p>

      <H2>When do classes start / how do I join?</H2>
      <p>
        After your enrolment is confirmed, we send the class schedule and joining links. Classes are delivered live
        online. Check the <strong>Classes</strong> section of your portal for upcoming sessions.
      </p>

      <H2>How do I get a receipt?</H2>
      <p>
        A payment receipt is emailed automatically once your enrolment is approved. If you need another copy, reply to
        that email or contact us with your payment reference.
      </p>

      <H2>Still need help?</H2>
      <p>
        Email <a href="mailto:dmathstuition@gmail.com" className="font-semibold text-gold-deep underline">dmathstuition@gmail.com</a>{" "}
        and we'll get back to you within 24 hours.
      </p>
    </LegalPage>
  );
}
