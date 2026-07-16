import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Annex 1 — ICT Asset Inventory",
  description:
    "Fill in your office's ICT equipment and software inventory for the ISSP Annex 1 submission.",
  path: "/annex1",
});

export default function Annex1Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Editor
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">
              ISSP Builder
            </p>
            <p className="text-sm font-semibold text-foreground leading-none truncate font-[family-name:var(--font-display)]">
              Annex 1: ICT Asset Inventory
            </p>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
