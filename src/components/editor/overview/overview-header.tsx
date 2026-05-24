"use client";

import type { IsspDocument } from "@/lib/store";
import { CompletionBar } from "@/components/ui/completion-bar";
import { Menu } from "lucide-react";
import { useEditorMobileSidebar } from "@/components/editor/editor-mobile-sidebar-context";

export function OverviewHeader({
  doc,
  doneCount,
  totalCount,
}: {
  doc: IsspDocument;
  doneCount: number;
  totalCount: number;
}) {
  const mobileSidebar = useEditorMobileSidebar();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          aria-label="Open editor navigation"
          onClick={mobileSidebar?.openMobileSidebar}
          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 font-display text-3xl font-medium tracking-tight leading-tight">
          {doc.title}
        </h1>
      </div>
      <div className="w-full shrink-0 pt-1.5 sm:w-52">
        <CompletionBar numerator={doneCount} denominator={totalCount} showLabel />
      </div>
    </div>
  );
}
