import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { IsspStoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
// From the plain module, not the client one: a value imported from a
// "use client" file arrives here as a client reference, not the array.
import {
  BETTERGOV_PREV_KEY,
  BETTERGOV_RESET_KEY,
  BETTERGOV_THEME,
  DEFAULT_THEME,
  THEMES,
  THEME_MIGRATED_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/themes";
import { ThemeNotice } from "@/components/theme-notice";
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

// Self-hosted (next/font/local): the files in ./fonts are the latin subsets
// Google served for these exact family/weight requests. Self-hosting removes
// the compile-time fetch — Turbopack's font mapping broke against Google's
// current css2 responses (the same variable file served for every weight), and
// the demo must not depend on venue network access.
const fraunces = localFont({
  src: "./fonts/Fraunces.woff2",
  variable: "--font-display",
  weight: "100 900",
});

const ibmPlexSans = localFont({
  src: "./fonts/IBMPlexSans.woff2",
  variable: "--font-sans",
  weight: "400 600",
});

// eGov theme only (see globals.css .theme-egov-light/.theme-egov-dark):
// the vendored kit's own typeface, loaded globally like the others but
// only referenced when that theme's --font-body/--font-display point to it.
const lexend = localFont({
  src: "./fonts/Lexend.woff2",
  variable: "--font-egov",
  weight: "300 700",
});

// Kapwa theme only (see globals.css .theme-bettergov):
// BetterGov.ph's Kapwa design system typeface (--font-kapwa-sans).
const inter = localFont({
  src: "./fonts/Inter.woff2",
  variable: "--font-kapwa",
  weight: "400 700",
});

const figtree = localFont({
  src: "./fonts/Figtree.woff2",
  variable: "--font-kapwa-display",
  weight: "500 700",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono.woff2",
  variable: "--font-kapwa-mono",
  weight: "400 600",
});

const ibmPlexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-400.woff2", weight: "400" },
    { path: "./fonts/IBMPlexMono-500.woff2", weight: "500" },
  ],
  variable: "--font-mono",
});

// The list is inlined from THEMES rather than hand-written, so adding a theme
// there can never leave this pre-hydration script behind.
const themeScript = `
(function() {
  try {
    var themes = ${JSON.stringify(THEMES.map((theme) => theme.id))};
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (stored === 'system-light' && !localStorage.getItem('${THEME_MIGRATED_KEY}')) {
      stored = '${DEFAULT_THEME}';
      localStorage.setItem('${THEME_STORAGE_KEY}', stored);
      localStorage.setItem('${THEME_MIGRATED_KEY}', '1');
    }
    var theme = themes.indexOf(stored) === -1 ? '${DEFAULT_THEME}' : stored;
    if (!localStorage.getItem('${BETTERGOV_RESET_KEY}')) {
      localStorage.setItem('${BETTERGOV_RESET_KEY}', '1');
      if (theme !== '${BETTERGOV_THEME}') {
        localStorage.setItem('${BETTERGOV_PREV_KEY}', theme);
        localStorage.setItem('${THEME_STORAGE_KEY}', '${BETTERGOV_THEME}');
        theme = '${BETTERGOV_THEME}';
      }
    }
    var root = document.documentElement;
    for (var i = 0; i < themes.length; i++) root.classList.remove('theme-' + themes[i]);
    root.classList.add('theme-' + theme);
  } catch (e) {
    document.documentElement.classList.add('theme-${DEFAULT_THEME}');
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
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${lexend.variable} ${inter.variable} ${figtree.variable} ${jetbrainsMono.variable} theme-${DEFAULT_THEME} h-full antialiased`}
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
            <ThemeNotice />
            <Toaster richColors closeButton position="top-right" />
          </IsspStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
