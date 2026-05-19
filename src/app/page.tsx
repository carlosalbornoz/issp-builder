import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import matter from "gray-matter";
import type { Metadata } from "next";
import HomePageClient from "@/components/home/home-page-client";

const SITE_URL = "https://apps.carlosanton.io/issp";

export const metadata: Metadata = {
  title: "ISSP Platform — ISSP compliance, finally structured.",
  description:
    "A volunteer-built tool that turns the DICT ISSP template into a guided, part-by-part editor. No account. No server. Works in your browser.",
  openGraph: {
    title: "ISSP Builder — ISSP compliance, finally structured.",
    description:
      "Free, browser-based ISSP editor for Philippine government agencies. Aligned to the DICT 2026 template. No account, no server — your data never leaves your device.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "ISSP Builder — ISSP compliance, finally structured.",
    description:
      "Free, browser-based ISSP editor for Philippine government agencies. Aligned to the DICT 2026 template. No account, no server — your data never leaves your device.",
  },
};

async function readContentHtml(slug: string): Promise<string> {
  const filePath = path.join(process.cwd(), "content", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  return processed.toString();
}

export default async function HomePage() {
  const [aboutHtml, privacyHtml] = await Promise.all([
    readContentHtml("about"),
    readContentHtml("privacy"),
  ]);

  return <HomePageClient aboutHtml={aboutHtml} privacyHtml={privacyHtml} />;
}
