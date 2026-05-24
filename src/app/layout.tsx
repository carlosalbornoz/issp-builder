import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { IsspStoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
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

const SITE_URL = "https://apps.carlosanton.io/issp";
const OG_IMAGE = `${SITE_URL}/opengraph-image`;

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
  title: {
    default: "ISSP Platform PH",
    template: "%s | ISSP Platform PH",
  },
  description:
    "A civic technology platform making Philippine government ICT plans visible, accessible, and accountable.",
  openGraph: {
    type: "website",
    siteName: "ISSP Builder",
    locale: "en_PH",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "ISSP Builder" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <IsspStoreProvider>
            {children}
            <Toaster richColors closeButton position="bottom-right" />
          </IsspStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
