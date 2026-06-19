import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import matter from "gray-matter";
import type { Metadata } from "next";
import HomePageClient from "@/components/home/home-page-client";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ISSP Builder — Free DICT ISSP Editor for Philippine Government Agencies",
  description:
    "Free, browser-based ISSP editor for Philippine government agencies. Aligned to the DICT 2026 template. No account, no server, no ads — your data stays in your browser.",
});

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
