import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { IsspStoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { StructuredData } from "@/components/seo/structured-data";
import {
  CREATOR_NAME,
  CREATOR_URL,
  OG_IMAGE_PATH,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const themeScript = `
(function() {
  try {
    var themes = ['system-light', 'system-dark', 'warm-light', 'warm-dark'];
    var stored = localStorage.getItem('issp-theme');
    var theme = themes.indexOf(stored) === -1 ? 'system-light' : stored;
    var root = document.documentElement;
    for (var i = 0; i < themes.length; i++) root.classList.remove('theme-' + themes[i]);
    root.classList.add('theme-' + theme);
  } catch (e) {
    document.documentElement.classList.add('theme-system-light');
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "ISSP Builder — Free DICT ISSP Editor for Philippine Government Agencies",
    template: "%s | ISSP Builder",
  },
  description:
    "Free, local-first ISSP Builder for Philippine government agencies preparing DICT Information Systems Strategic Plans. Built by Carlos Antonio Albornoz.",
  keywords: SEO_KEYWORDS,
  authors: [{ name: CREATOR_NAME, url: CREATOR_URL }],
  creator: CREATOR_NAME,
  publisher: CREATOR_NAME,
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    title: "ISSP Builder — Free DICT ISSP Editor",
    description:
      "Prepare Philippine government Information Systems Strategic Plans with a free, browser-based editor aligned to the DICT 2026 ISSP template.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_PH",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ISSP Builder — Free DICT ISSP Editor",
    description:
      "A free, local-first ISSP editor for Philippine government agencies. Built by Carlos Antonio Albornoz.",
    images: [OG_IMAGE_PATH],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} theme-system-light h-full antialiased`}
    >
      <head>
        <StructuredData />
        {/* Ad blockers (e.g. AdGuard) rewrite inline scripts before hydration;
            the theme init has already run by then, so the mismatch is benign. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <IsspStoreProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </IsspStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
