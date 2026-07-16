import {
  CONTACT_EMAIL,
  CREATOR_NAME,
  CREATOR_URL,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export function StructuredData() {
  const graph = [
    {
      "@type": "Person",
      "@id": `${CREATOR_URL}/#person`,
      name: CREATOR_NAME,
      url: CREATOR_URL,
      email: `mailto:${CONTACT_EMAIL}`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ["ISSP Platform", "ISSP Platform PH"],
      url: SITE_URL,
      inLanguage: "en-PH",
      creator: { "@id": `${CREATOR_URL}/#person` },
      publisher: { "@id": `${CREATOR_URL}/#person` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      alternateName: ["ISSP Platform", "ISSP Platform PH"],
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      url: SITE_URL,
      image: absoluteUrl("/opengraph-image"),
      description:
        "A free, local-first web app for preparing Philippine government Information Systems Strategic Plans using the DICT 2026 ISSP template.",
      creator: { "@id": `${CREATOR_URL}/#person` },
      author: { "@id": `${CREATOR_URL}/#person` },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "PHP",
        availability: "https://schema.org/InStock",
      },
      audience: {
        "@type": "Audience",
        audienceType: "Philippine government agencies preparing ISSP submissions",
      },
      isAccessibleForFree: true,
      keywords:
        "ISSP, Information Systems Strategic Plan, DICT ISSP, Philippine government ICT planning, DICT 2026 ISSP template",
    },
  ];

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
