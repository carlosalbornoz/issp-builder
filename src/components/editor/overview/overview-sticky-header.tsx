"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import type { IsspDocument } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEditorMobileSidebar } from "@/components/editor/editor-mobile-sidebar-context";
import { PlanMetadataStrip } from "./plan-metadata-strip";
import { OverviewHeader } from "./overview-header";

// Header collapses past COLLAPSE_PX and only expands again once scrolled back
// above EXPAND_PX. The hysteresis gap stops it flapping open/closed when the
// scroll position hovers near a single boundary. (Mirrors section-shell.tsx.)
const COLLAPSE_PX = 40;
const EXPAND_PX = 10;

export function OverviewStickyHeader({
  doc,
  doneCount,
  totalCount,
}: {
  doc: IsspDocument;
  doneCount: number;
  totalCount: number;
}) {
  const mobileSidebar = useEditorMobileSidebar();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const scrollContainer = headerRef.current?.closest("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const top = scrollContainer.scrollTop;
      setIsCompact((prev) => (prev ? top > EXPAND_PX : top > COLLAPSE_PX));
    };
    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const agency = doc.agency.acronym || doc.agency.name || "Agency";
  const years = `${doc.startYear}–${String(doc.endYear).slice(-2)}`;

  return (
    <div
      ref={headerRef}
      className="sticky top-0 z-10 -mx-4 px-4 md:-mx-8 md:px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mt-4 md:-mt-8 [overflow-anchor:none]"
    >
      {/* Compact bar — plan identity + progress, shown once scrolled */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isCompact ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!isCompact}>
          <div className="flex items-center gap-2 py-2.5">
            <button
              type="button"
              aria-label="Open editor navigation"
              onClick={mobileSidebar?.openMobileSidebar}
              className="-ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate font-display text-sm font-semibold">
              {agency} · {years}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full header — metadata strip + greeting + progress, collapses away once scrolled */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isCompact ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden" inert={isCompact}>
          <div className="space-y-6 pt-4 md:pt-8 pb-5 md:pb-6">
            <PlanMetadataStrip doc={doc} />
            <OverviewHeader doc={doc} doneCount={doneCount} totalCount={totalCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
