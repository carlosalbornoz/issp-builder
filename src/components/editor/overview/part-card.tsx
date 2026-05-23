import Link from "next/link";
import type { SectionMeta } from "@/lib/store";
import { StatusDot } from "@/components/ui/status-dot";
import { RelativeTime } from "@/components/ui/relative-time";
import { computeStatus, computePartStatus, type PartDef } from "@/lib/sections";

export function PartCard({
  part,
  sectionMeta,
}: {
  part: PartDef;
  sectionMeta: Record<string, SectionMeta>;
}) {
  const partStatus = computePartStatus(part.sections, sectionMeta);

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
        <StatusDot status={partStatus} size={8} className="mt-2 shrink-0" />
      </div>

      {/* Section rows */}
      <ul className="pl-5 pr-4 py-2 space-y-0">
        {part.sections.map((section) => {
          const meta = sectionMeta[section.id];
          const status = computeStatus(meta);
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <StatusDot status={status} size={6} className="shrink-0" />
                <span className="flex-1 truncate">{section.label}</span>
                <RelativeTime
                  iso={meta?.lastEditedAt}
                  className="text-xs text-muted-foreground/50 shrink-0"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
