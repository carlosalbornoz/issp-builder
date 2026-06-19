import type { Metadata } from "next";

export const SITE_URL = "https://apps.carlosanton.io/issp";
export const SITE_NAME = "ISSP Builder";
export const CREATOR_NAME = "Carlos Antonio Albornoz";
export const CREATOR_URL = "https://carlosanton.io";
export const CONTACT_EMAIL = "issp-builder@carlosanton.io";
export const OG_IMAGE_PATH = "/opengraph-image";

export const SEO_KEYWORDS = [
  "ISSP",
  "ISSP Builder",
  "ISSP Platform",
  "Information Systems Strategic Plan",
  "DICT ISSP",
  "DICT ISSP template",
  "Philippines ISSP",
  "Philippine government ISSP",
  "government ICT planning",
  "ICT strategic plan Philippines",
  "DICT 2026 ISSP template",
  "Carlos Antonio Albornoz",
];

export function absoluteUrl(path = "") {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_PH",
      type: "website",
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}
