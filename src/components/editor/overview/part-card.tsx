import Link from "next/link";
import type { SectionMeta } from "@/lib/store";
import { StatusDot } from "@/components/ui/status-dot";
import { RelativeTime } from "@/components/ui/relative-time";
import { computeStatus, computePartStatus, type PartDef } from "@/lib/sections";
import { AlertTriangle, Landmark, ClipboardCheck, Target, Wallet, type LucideIcon } from "lucide-react";

// One icon per Part, tied to what each Part is actually about (not just decoration).
const PART_ICONS: Record<PartDef["partNum"], LucideIcon> = {
  1: Landmark,        // Agency Profile — the institution
  2: ClipboardCheck,  // Current ICT Assessment — taking stock
  3: Target,          // Proposed ICT Strategy — strategic thrusts
  4: Wallet,          // Resource Requirements — the budget
};

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
  const Icon = PART_ICONS[part.partNum];

  return (
    <div className="rounded-xl border bg-card overflow-hidden transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-foreground/30 hover:shadow-md focus-within:border-foreground/30 focus-within:shadow-md">
      {/* Card header */}
      <div className="pl-4 pr-4 pt-4 pb-3 border-b flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `color-mix(in srgb, ${part.color} 10%, transparent)`, color: part.color }}
            >
              Part {part.part}
            </span>
            <span className="text-xs text-muted-foreground">{part.sections.length} sections</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 sm:min-h-[2.75rem]">
            <Icon className="h-5 w-5 shrink-0" style={{ color: part.color }} aria-hidden="true" />
            <p className="font-display text-base font-medium leading-snug line-clamp-2 break-words min-w-0">{part.title}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 mt-1.5">
          {pendingCount > 0 && (
            <span className="whitespace-nowrap rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning">
              {pendingCount} to review
            </span>
          )}
          <StatusDot status={partStatus} size={8} className="shrink-0" />
        </div>
      </div>

      {/* Section rows */}
      <ul className="pl-4 pr-4 py-2 space-y-0">
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
                    className="text-xs text-muted-foreground shrink-0"
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
