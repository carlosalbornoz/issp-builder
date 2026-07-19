"use client";

import Link from "next/link";
import { PlayCircle, ArrowRight } from "lucide-react";
import type { SectionMeta } from "@/lib/store";
import { RelativeTime } from "@/components/ui/relative-time";
import { findContinueTarget } from "@/lib/sections";

export function ContinueEditingCard({
  sectionMeta,
}: {
  sectionMeta: Record<string, SectionMeta>;
}) {
  const hasAnyEdit = Object.values(sectionMeta).some((m) => m.lastEditedAt);
  const { section, part, lastEditedAt } = findContinueTarget(sectionMeta);

  return (
    <Link
      href={section.href}
      className="flex items-center gap-4 rounded-xl border border-info bg-card px-5 py-4 transition-colors hover:bg-accent group"
    >
      <PlayCircle className="h-5 w-5 shrink-0 text-info" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-info">
          {hasAnyEdit ? "Continue where you left off" : "Start with Part I"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Part {part.part} · {section.label}
          {lastEditedAt && (
            <> · <RelativeTime iso={lastEditedAt} /></>
          )}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-info opacity-60 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
