import { siteBaseUrl } from "@/lib/siteUrl";

// ── Social / profile links ───────────────────────────────────────────
// ✏️  PASTE YOUR PUBLIC PROFILE URLS HERE (Facebook, Instagram, TikTok,
//     LinkedIn, YouTube…). They tell Google these pages belong to the same
//     D-Maths brand. Edit this list on GitHub anytime — one URL per line.
const SOCIAL_LINKS: string[] = [
  // "https://facebook.com/...",
  // "https://instagram.com/...",
];

// JSON-LD structured data: helps Google understand the business (name, logo,
// location, contact) and can produce a richer "brand" result. Rendered once,
// site-wide, from the canonical domain. JSON-LD is data, not executable code.
export default function StructuredData() {
  const base = siteBaseUrl();

  const graph = [
    {
      "@type": "EducationalOrganization",
      "@id": `${base}/#org`,
      name: "D-Maths Tuition Centre",
      alternateName: "D-Maths",
      url: base,
      logo: `${base}/dmathslogo.png`,
      image: `${base}/dmathslogo.png`,
      description:
        "World-class online mathematics and coding tuition for JSS & SSS students across Nigeria — live classes, personalised feedback and a portal built for results.",
      email: "dmathstuition@gmail.com",
      telephone: "+2347025674894",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Asaba",
        addressRegion: "Delta State",
        addressCountry: "NG",
      },
      areaServed: { "@type": "Country", name: "Nigeria" },
      ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: base,
      name: "D-Maths Tuition Centre",
      publisher: { "@id": `${base}/#org` },
      inLanguage: "en-NG",
    },
  ];

  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
