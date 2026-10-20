"use client";

/**
 * Shared chrome for the public demonstration surfaces (/repository, /budget).
 * Mirrors the marketing home page's shell: sticky h-14 header, equalizer brand
 * marks, token-only colors, border-t footer — so the mockups read as part of
 * the product rather than a separate site.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

// Part colors from sections.ts (same fixed brand artifact as home-page-client)
const PART_COLORS = ["#2563EB", "#D97706", "#16A34A", "#7C3AED"];

export type ShellSection = "repository" | "budget" | null;

export function PublicShell({
  active,
  width = "default",
  children,
}: {
  active: ShellSection;
  width?: "default" | "wide";
  children: React.ReactNode;
}) {
  const navCls = (on: boolean) =>
    cn(
      "px-3 py-1.5 text-sm rounded-md transition-colors",
      on ? "text-primary font-medium bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent"
    );

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div
          className={cn(
            "mx-auto px-6 h-14 flex items-center justify-between gap-4",
            width === "wide" ? "max-w-7xl" : "max-w-6xl"
          )}
        >
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <span className="flex gap-0.5 mr-1 shrink-0" aria-hidden>
              {PART_COLORS.map((c, i) => (
                <span key={c} className="w-1.5 h-4 rounded-full" style={{ background: c, opacity: 0.4 + i * 0.2 }} />
              ))}
            </span>
            <span className="font-display font-semibold text-sm tracking-tight whitespace-nowrap">ISSP Platform</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border bg-secondary text-muted-foreground whitespace-nowrap">
              Preview
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/repository" className={navCls(active === "repository")}>
              Repository
            </Link>
            <Link href="/budget" className={navCls(active === "budget")}>
              Budget Dashboard
            </Link>
            <Link href="/budget/data-standard" className={cn(navCls(false), "hidden md:block")}>
              Data standard
            </Link>
            <Link href="/" className={cn(navCls(false), "hidden sm:block")}>
              ISSP Builder
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-0.5" aria-hidden>
              {PART_COLORS.map((c) => (
                <span key={c} className="w-1 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ISSP Platform — demonstration preview. All data on these pages is fictitious.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com/carlosalbornoz/issp-builder"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
