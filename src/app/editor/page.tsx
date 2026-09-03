"use client";

import { AlertTriangle } from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { useResolvedScope } from "@/hooks/use-resolved-scope";
import { isSectionVisible } from "@/lib/scope/paths";
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
  const scope = useResolvedScope();
  if (!doc) return null;

  const sectionMeta = doc.sectionMeta ?? {};
  // Scope-filter both counts so a scoped doc's header matches the visible cards
  // (e.g. "2 of 4", not "2 of 21"). Null scope ⇒ isSectionVisible is always true,
  // so visibleSections === ALL_SECTIONS and behavior is unchanged when unscoped.
  const visibleSections = ALL_SECTIONS.filter((s) => isSectionVisible(scope, s.id));
  const doneCount = visibleSections.filter(
    (s) => computeStatus(sectionMeta[s.id]) === "done"
  ).length;
  const pendingSectionIds = doc.migrationReview?.pendingSectionIds ?? [];
  const firstPendingSection = getMigrationReviewSection(pendingSectionIds[0] ?? "");
  // Pass the visible set to the Continue card so it can't link to a hidden
  // section. Null scope ⇒ null set ⇒ findContinueTarget considers all sections.
  const continueVisibleIds = scope ? new Set(visibleSections.map((s) => s.id)) : null;

  // Scoped docs hide non-owned sections across the overview. Null scope ⇒ all visible.
  const visibleFrontMatter = FRONT_MATTER_SECTIONS.filter((s) => isSectionVisible(scope, s.id));
  const visibleParts = PARTS.filter((p) => p.sections.some((s) => isSectionVisible(scope, s.id)));

  return (
    <div className="space-y-6">
      <OverviewStickyHeader doc={doc} doneCount={doneCount} totalCount={visibleSections.length} />
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
      <ContinueEditingCard sectionMeta={sectionMeta} visibleSectionIds={continueVisibleIds} />
      {visibleFrontMatter.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden transition-[border-color] duration-150 motion-reduce:transition-none focus-within:border-foreground/30">
          {visibleFrontMatter.map((section) => (
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
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleParts.map((part) => (
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
