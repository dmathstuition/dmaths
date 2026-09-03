import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata = { title: "Terms of Service — D-Maths Tuition Centre", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 2026">
      <p>
        These terms govern your use of the D-Maths Tuition Centre online portal and tuition
        services. By applying for enrolment or using the portal, the student and their
        parent/guardian agree to these terms.
      </p>

      <H2>Enrolment</H2>
      <p>
        Enrolment is by application and is subject to approval by D-Maths. We may decline or
        revoke enrolment at our discretion, including where information provided is inaccurate or
        where conduct disrupts the learning of others. A parent or guardian must consent to a
        minor's enrolment.
      </p>

      <H2>Fees and payment</H2>
      <p>
        Tuition is charged <strong>per hour</strong> at the rate for the learner&apos;s class,
        published on our <a href="/pricing" className="underline">pricing page</a>. No payment is
        taken at sign-up. We record the hours a learner attends each month and total them
        automatically; that month&apos;s invoice is raised about three days before month-end and is
        due <strong>on or before the last day of the month</strong>. You may pay from the portal by
        card or bank through our payment processor, Paystack, or by bank transfer/Opay to the
        accounts we specify. Access to classes and portal features may be paused if an invoice is
        not settled by its due date. Prices may be changed with reasonable notice. We are not
        responsible for payments made to any account other than those we officially provide —
        always confirm account details directly with us before paying.
      </p>

      <H2>Programmes and camps</H2>
      <p>
        From time to time we run fixed programmes such as the D-Maths Online Summer Camp. Each
        programme is offered for a stated period and package, places may be limited, and the
        specific fee, dates and inclusions are shown at sign-up. Refunds for fixed programmes are
        governed by our Payment &amp; Refund Policy.
      </p>

      <H2>Use of the portal</H2>
      <p>
        Login credentials are personal to each account holder and must not be shared. Parents or
        guardians may be given their own account, through which they can view only the records of
        their own linked child. You are responsible for activity under your account. You agree not
        to misuse the portal, attempt to access other users' data, upload harmful files, or use
        the service for any unlawful purpose. We may suspend accounts that breach these terms.
      </p>

      <H2>Academic content</H2>
      <p>
        Lesson materials, assignments, and other content provided through the portal are for the
        personal educational use of enrolled students only. They may not be copied, redistributed,
        resold, or shared publicly without our written permission.
      </p>

      <H2>Classes</H2>
      <p>
        Classes are delivered online at scheduled times. We aim to hold all scheduled sessions but
        may reschedule where necessary (for example, due to technical issues), giving as much
        notice as practicable. Students are expected to attend punctually and engage respectfully.
      </p>

      <H2>No guarantee of results</H2>
      <p>
        We are committed to high-quality teaching, but academic outcomes depend on many factors
        including student effort. We do not guarantee specific examination grades or results.
      </p>

      <H2>Limitation of liability</H2>
      <p>
        To the fullest extent permitted by Nigerian law, D-Maths is not liable for indirect or
        consequential losses arising from use of the service, or for interruptions caused by
        third-party providers (internet, hosting, or payment platforms) outside our reasonable
        control.
      </p>

      <H2>Conduct and safeguarding</H2>
      <p>
        We are committed to a safe learning environment for minors. Abusive, threatening, or
        inappropriate behaviour by any user may result in immediate removal. Guardians should
        contact us promptly with any safeguarding concern.
      </p>

      <H2>Changes to these terms</H2>
      <p>
        We may update these terms from time to time. Continued use of the portal after changes
        take effect constitutes acceptance of the updated terms.
      </p>

      <H2>Governing law</H2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria.
      </p>

      <H2>Contact</H2>
      <p>support@dmaths.academy</p>
    </LegalPage>
  );
}
