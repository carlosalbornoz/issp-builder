import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { IsspStoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ISSP Platform PH",
    template: "%s | ISSP Platform PH",
  },
  description:
    "A civic technology platform making Philippine government ICT plans visible, accessible, and accountable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
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
