import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import matter from "gray-matter";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About ISSP Builder and Carlos Antonio Albornoz",
  description:
    "The story behind ISSP Builder: a free, volunteer-built tool by Carlos Antonio Albornoz for Philippine government ISSP compliance.",
  path: "/about",
});

async function getAboutContent() {
  const filePath = path.join(process.cwd(), "content", "about.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);

  // Rough reading time
  const wordCount = content.trim().split(/\s+/).length;
  const readingMins = Math.max(1, Math.round(wordCount / 200));

  return {
    title: data.title as string,
    author: data.author as string,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    html: processed.toString(),
    readingTime: `${readingMins} min read`,
  };
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Author initials avatar
function Avatar() {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
      style={{ background: "#111827" }}
      aria-hidden="true"
    >
      CA
    </div>
  );
}

export default async function AboutPage() {
  const { title, author, date, html, readingTime } = await getAboutContent();

  return (
    <div className="min-h-screen bg-white">

      {/* ── Minimal publication header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: "#0038A8" }}
            >
              PH
            </div>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">ISSP Platform</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Sign In <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* ── Article ── */}
      <article className="max-w-[680px] mx-auto px-6">

        {/* Article header */}
        <header className="pt-14 pb-10">

          {/* Category */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "#0038A8" }}>
            About this project
          </p>

          {/* Title */}
          <h1 className="text-[2.6rem] font-bold leading-[1.15] tracking-tight text-gray-950 mb-6">
            {title}
          </h1>

          {/* Byline */}
          <div className="flex items-center gap-3">
            <Avatar />
            <div>
              <p className="text-sm font-medium text-gray-900 leading-none mb-1">{author}</p>
              <p className="text-xs text-gray-400">
                <time dateTime={date}>{formatDate(date)}</time>
                <span className="mx-1.5">·</span>
                {readingTime}
              </p>
            </div>
          </div>
        </header>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-10" />

        {/* Disclaimer */}
        <div className="prose-disclaimer mb-8">
          The thoughts here are my own and reflect my personal experience and opinion only — they do not represent the views of any organization I am or have been affiliated with. AI helped me turn these thoughts into words.
        </div>

        {/* Prose body */}
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />

        {/* Post footer */}
        <div className="mt-14 pt-8 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ background: "#0038A8" }}
          >
            Try the ISSP Builder <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bottom breathing room */}
        <div className="pb-20" />
      </article>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-[680px] mx-auto px-6 py-8 text-center">
          <p className="text-xs text-gray-400">
            Published on{" "}
            <Link href="/" className="hover:text-gray-700 transition-colors">ISSP Platform</Link>
            {" · "}Open source{" · "}Built by volunteers
          </p>
        </div>
      </footer>

    </div>
  );
}
