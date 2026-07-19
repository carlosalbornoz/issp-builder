"use client";

import { AlertTriangle } from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { OverviewStickyHeader } from "@/components/editor/overview/overview-sticky-header";
import { ContinueEditingCard } from "@/components/editor/overview/continue-editing-card";
import { PartCard } from "@/components/editor/overview/part-card";
import Link from "next/link";
import { StatusDot } from "@/components/ui/status-dot";
import { PARTS, ALL_SECTIONS, FRONT_MATTER_SECTIONS, computeStatus } from "@/lib/sections";
import { getMigrationReviewSection } from "@/lib/migration-review";

// ─── Overview view (document loaded) ─────────────────────────────────────────
// EditorShell (the layout wrapping this page) redirects to "/" and never mounts
// this page's children until a document exists, so `doc` is always present here.

function OverviewView() {
  const { doc } = useIsspStore();
  if (!doc) return null;

  const sectionMeta = doc.sectionMeta ?? {};
  const doneCount = ALL_SECTIONS.filter(
    (s) => computeStatus(sectionMeta[s.id]) === "done"
  ).length;
  const pendingSectionIds = doc.migrationReview?.pendingSectionIds ?? [];
  const firstPendingSection = getMigrationReviewSection(pendingSectionIds[0] ?? "");

  return (
    <div className="space-y-6">
      <OverviewStickyHeader doc={doc} doneCount={doneCount} totalCount={ALL_SECTIONS.length} />
      {pendingSectionIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning-border bg-warning-bg px-5 py-4 text-warning sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {pendingSectionIds.length} section{pendingSectionIds.length === 1 ? "" : "s"} need a quick migration review
            </p>
            <p className="mt-0.5 text-xs leading-relaxed">
              Your older file loaded successfully. Cross-check the highlighted sections, then mark each one as done again.
            </p>
          </div>
          {firstPendingSection && (
            <Link href={firstPendingSection.href} className="shrink-0 text-sm font-semibold text-warning hover:underline">
              Review {firstPendingSection.shortLabel} →
            </Link>
          )}
        </div>
      )}
      <ContinueEditingCard sectionMeta={sectionMeta} />
      <div className="rounded-xl border bg-card overflow-hidden transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-foreground/30 hover:shadow-md focus-within:border-foreground/30 focus-within:shadow-md">
        {FRONT_MATTER_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="flex items-center gap-2.5 pl-4 pr-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <StatusDot status={computeStatus(sectionMeta[section.id])} size={6} className="shrink-0" />
            <span className="flex-1 truncate flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Front Matter
              </span>
              {section.label}
            </span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PARTS.map((part) => (
          <PartCard key={part.partNum} part={part} sectionMeta={sectionMeta} pendingSectionIds={pendingSectionIds} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditorPage() {
  return <OverviewView />;
}
