"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useIsspStore } from "@/lib/store";
import { ALL_SECTIONS, PARTS, computeStatus } from "@/lib/sections";
import { useEditorMobileSidebar } from "./editor-mobile-sidebar-context";

// ─── SectionShell ─────────────────────────────────────────────────────────────

export interface SectionShellProps {
  /** Section ID matching keys in sections.ts, e.g. "part1/a" */
  sectionId: string;
  title: string;
  description: string;
  /** Optional stat block rendered top-right of the header */
  statBlock?: { label: string; value: string; caption?: string };
  children: React.ReactNode;
}

export function SectionShell({
  sectionId,
  title,
  description,
  statBlock,
  children,
}: SectionShellProps) {
  const router = useRouter();
  const { doc, updateSectionMeta } = useIsspStore();
  const mobileSidebar = useEditorMobileSidebar();

  // Derive part + section from config
  const sectionIndex = ALL_SECTIONS.findIndex((s) => s.id === sectionId);
  const section = ALL_SECTIONS[sectionIndex];
  const part = PARTS.find((p) => p.sections.some((s) => s.id === sectionId))!;

  const prevSection = sectionIndex > 0 ? ALL_SECTIONS[sectionIndex - 1] : null;
  const prevPart = prevSection
    ? PARTS.find((p) => p.sections.some((s) => s.id === prevSection.id))
    : null;
  const nextSection =
    sectionIndex < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[sectionIndex + 1] : null;
  const nextPart = nextSection
    ? PARTS.find((p) => p.sections.some((s) => s.id === nextSection.id))
    : null;
  const isLast = sectionIndex === ALL_SECTIONS.length - 1;

  const meta = doc?.sectionMeta?.[sectionId];
  const status = computeStatus(meta);
  const isDone = meta?.userMarkedDone ?? false;
  const sectionPrefix = section?.label.match(/^[A-Z][\d.]+/)?.[0] ?? null;

  const handleMarkDone = useCallback(
    (done: boolean) => {
      updateSectionMeta(sectionId, { userMarkedDone: done });
    },
    [sectionId, updateSectionMeta]
  );

  return (
    <div className="space-y-8">
      {/* ── Sticky section header ── */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <button
            type="button"
            aria-label="Open editor navigation"
            onClick={mobileSidebar?.openMobileSidebar}
            className="-ml-1 mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push("/editor")}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <LayoutDashboard className="h-3 w-3" />
            Overview
          </button>
          <span>/</span>
          <span className="font-semibold" style={{ color: part.color }}>
            Part {part.part}
          </span>
          <span>/</span>
          <span className="text-foreground truncate">{section?.label}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: part.color }}
              >
                Part {part.part}{sectionPrefix ? ` · ${sectionPrefix}` : ""}
              </p>
              <StatusDot status={status} size={7} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>

          {statBlock && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{statBlock.label}</p>
              <p className="text-2xl font-bold font-display">{statBlock.value}</p>
              {statBlock.caption && (
                <p className="text-xs text-muted-foreground">{statBlock.caption}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="space-y-6">{children}</div>

      {/* ── Footer ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t mt-8">
        <MarkAsDone isDone={isDone} onChange={handleMarkDone} />
        <SectionNavButtons
          prevSection={prevSection}
          prevPart={prevPart ?? null}
          nextSection={nextSection}
          nextPart={nextPart ?? null}
          isLast={isLast}
          router={router}
        />
      </div>
    </div>
  );
}

// ─── MarkAsDone ───────────────────────────────────────────────────────────────

function MarkAsDone({
  isDone,
  onChange,
}: {
  isDone: boolean;
  onChange: (done: boolean) => void;
}) {
  return (
    <Button
      variant={isDone ? "default" : "outline"}
      className={
        isDone
          ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
          : "text-muted-foreground"
      }
      onClick={() => onChange(!isDone)}
    >
      {isDone ? (
        <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 mr-2 shrink-0" />
      )}
      {isDone ? "Marked as done · Click to undo" : "Mark this section as done"}
    </Button>
  );
}

// ─── SectionNavButtons ────────────────────────────────────────────────────────

type SectionDef = (typeof ALL_SECTIONS)[number];
type PartDef = (typeof PARTS)[number];

function SectionNavButtons({
  prevSection,
  prevPart,
  nextSection,
  nextPart,
  isLast,
  router,
}: {
  prevSection: SectionDef | null;
  prevPart: PartDef | null;
  nextSection: SectionDef | null;
  nextPart: PartDef | null;
  isLast: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="flex items-center gap-3 ml-auto">
      {prevSection && (
        <Button
          variant="outline"
          onClick={() => router.push(prevSection.href)}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-xs text-muted-foreground mr-0.5">
            {prevPart?.part !== undefined ? `Part ${prevPart.part}` : ""}
          </span>
          <span className="truncate max-w-[140px]">
            {prevSection.label.replace(/^[A-Z][\d.]+\s*/, "")}
          </span>
        </Button>
      )}

      {isLast ? (
        <Button onClick={() => router.push("/editor")} className="gap-1.5">
          <LayoutDashboard className="h-4 w-4" />
          Return to Overview
        </Button>
      ) : nextSection ? (
        <Button onClick={() => router.push(nextSection.href)} className="gap-1.5">
          <span className="hidden sm:inline text-xs opacity-70 mr-0.5">
            {nextPart?.part !== undefined ? `Part ${nextPart.part}` : ""}
          </span>
          <span className="truncate max-w-[140px]">
            {nextSection.label.replace(/^[A-Z][\d.]+\s*/, "")}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
