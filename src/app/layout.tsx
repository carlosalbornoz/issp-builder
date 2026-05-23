import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { IsspStoreProvider } from "@/lib/store";
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
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IsspStoreProvider>
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </IsspStoreProvider>
      </body>
    </html>
  );
}
