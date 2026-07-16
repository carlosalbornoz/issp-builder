import Link from "next/link";
import type { SectionMeta } from "@/lib/store";
import { StatusDot } from "@/components/ui/status-dot";
import { RelativeTime } from "@/components/ui/relative-time";
import { computeStatus, computePartStatus, type PartDef } from "@/lib/sections";
import { AlertTriangle } from "lucide-react";

export function PartCard({
  part,
  sectionMeta,
  pendingSectionIds = [],
}: {
  part: PartDef;
  sectionMeta: Record<string, SectionMeta>;
  pendingSectionIds?: string[];
}) {
  const partStatus = computePartStatus(part.sections, sectionMeta);
  const pendingCount = part.sections.filter((section) => pendingSectionIds.includes(section.id)).length;

  return (
    <div className="relative rounded-xl border bg-card overflow-hidden">
      {/* 3px left color strip */}
      <div className="absolute left-0 inset-y-0 w-[3px]" style={{ backgroundColor: part.color }} />

      {/* Card header */}
      <div className="pl-5 pr-4 pt-4 pb-3 border-b flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Part {part.part} · {part.sections.length} sections
          </p>
          <p className="font-display text-base font-medium mt-0.5 leading-snug">{part.title}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {pendingCount > 0 && (
            <span className="rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning">
              {pendingCount} to review
            </span>
          )}
          <StatusDot status={partStatus} size={8} className="shrink-0" />
        </div>
      </div>

      {/* Section rows */}
      <ul className="pl-5 pr-4 py-2 space-y-0">
        {part.sections.map((section) => {
          const meta = sectionMeta[section.id];
          const status = computeStatus(meta);
          const needsReview = pendingSectionIds.includes(section.id);
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                className={needsReview
                  ? "-mx-2 flex items-center gap-2.5 rounded-md border border-warning-border bg-warning-bg px-2 py-1.5 text-sm text-foreground transition-colors hover:brightness-95"
                  : "flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"}
              >
                {!section.readOnly && <StatusDot status={status} size={6} className="shrink-0" />}
                <span className="flex-1 truncate">{section.label}</span>
                {needsReview ? (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-warning">
                    <AlertTriangle className="h-3 w-3" /> Review required
                  </span>
                ) : (
                  <RelativeTime
                    iso={meta?.lastEditedAt}
                    className="text-xs text-muted-foreground/50 shrink-0"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
