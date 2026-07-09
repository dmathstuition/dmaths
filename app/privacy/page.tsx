import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — D-Maths Tuition Centre", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 2026">
      <p>
        D-Maths Tuition Centre ("we", "us") operates an online mathematics tuition service for
        students in Nigeria. This policy explains what personal information we collect, why we
        collect it, and how we protect it. It is written to comply with the Nigeria Data
        Protection Act 2023 (NDPA) and the Nigeria Data Protection Regulation (NDPR).
      </p>

      <H2>Who this policy covers</H2>
      <p>
        Our students are mostly under 18. We collect a parent or guardian's name and contact
        details with every application, and by submitting an application the guardian consents to
        the processing of the student's information as described here. A parent or guardian may
        also be given their own portal account (with an email and password) to view their own
        child's progress. A guardian may withdraw consent at any time by contacting us, after
        which the student's account will be closed and data deleted as described below.
      </p>

      <H2>What we collect</H2>
      <p>
        Through the enrolment application and portal we collect: the student's name, date of
        birth, email address, phone number, home address, academic level and subjects; the
        guardian's name, contact and (where provided) email; academic and conduct records
        generated through use of the portal (assignment grades, attendance, progress, behaviour
        notes, reward stars and badges); and payment records (the payment reference, amount,
        method and status). We do not store card numbers or bank credentials — online card and
        bank payments are processed securely by Paystack, and bank-transfer/Opay payments are
        made directly to the accounts we provide.
      </p>

      <H2>Why we collect it</H2>
      <p>
        We use this information solely to deliver tuition services: creating and managing student
        accounts, scheduling classes, grading assignments, tracking academic progress and
        behaviour, giving parents/guardians portal access to their own child's records, contacting
        students and guardians about classes and results, and verifying enrolment payments. We do
        not sell, rent, or trade personal information to anyone, and we do not use it for
        third-party advertising.
      </p>

      <H2>Where it is stored and how it is protected</H2>
      <p>
        Data is stored with Supabase (our database provider) on encrypted infrastructure, with
        row-level security ensuring each student can only access their own records. Passwords are
        hashed with industry-standard algorithms and are never visible to staff. Access to
        administrative functions is restricted to authorised D-Maths staff. Transport between
        your device and our servers is encrypted (HTTPS).
      </p>

      <H2>Who we share it with</H2>
      <p>
        We share data only with the service providers required to run the portal: Supabase
        (database and authentication), Vercel (website hosting), Google (email delivery and —
        with your agreement — anonymous Google Analytics usage statistics), and Paystack
        (processing online card and bank payments). Each processes data on our instructions. We
        may disclose information if required by Nigerian law or a valid legal process.
      </p>

      <H2>How long we keep it</H2>
      <p>
        We keep student records while the student is enrolled and for up to 12 months after the
        account becomes inactive, to allow re-enrolment and to issue academic records on request.
        After that, records are deleted. A guardian or former student may request earlier deletion
        at any time.
      </p>

      <H2>Your rights</H2>
      <p>
        Under the NDPA, students and guardians have the right to access the personal data we hold,
        correct inaccurate data, request deletion, withdraw consent, and lodge a complaint with
        the Nigeria Data Protection Commission. To exercise any of these rights, email us at
        dmathstuition@gmail.com — we will respond within 30 days.
      </p>

      <H2>Cookies</H2>
      <p>
        The portal uses only essential cookies needed to keep you signed in securely. We do not
        use advertising or tracking cookies.
      </p>

      <H2>Changes to this policy</H2>
      <p>
        If we make material changes, we will update this page and notify guardians by email
        before the changes take effect.
      </p>

      <H2>Contact</H2>
      <p>
        Questions or requests: dmathstuition@gmail.com.
      </p>
    </LegalPage>
  );
}
