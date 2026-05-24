import type { SectionMeta, SectionStatus } from "@/lib/store";

export interface SectionDef {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /** Read-only sections (e.g. computed summaries) are excluded from status tracking */
  readonly readOnly?: true;
}

export interface PartDef {
  readonly partNum: 1 | 2 | 3 | 4;
  readonly part: "I" | "II" | "III" | "IV";
  readonly title: string;
  readonly color: string;
  readonly sections: readonly SectionDef[];
}

export const PARTS: readonly PartDef[] = [
  {
    partNum: 1, part: "I", title: "Agency Profile & Strategic Context", color: "var(--part-1)",
    sections: [
      { id: "part1/a", label: "A. Mandate, Vision & Mission", href: "/editor/part1/a" },
      { id: "part1/b", label: "B. Organization Structure",    href: "/editor/part1/b" },
      { id: "part1/c", label: "C. Stakeholder Analysis",      href: "/editor/part1/c" },
    ],
  },
  {
    partNum: 2, part: "II", title: "Current ICT Assessment", color: "var(--part-2)",
    sections: [
      { id: "part2/a", label: "A. Strategic Concerns",        href: "/editor/part2/a" },
      { id: "part2/b", label: "B. Network & Cybersecurity",   href: "/editor/part2/b" },
      { id: "part2/c", label: "C. IS Inventory",              href: "/editor/part2/c" },
      { id: "part2/d", label: "D. E-Government Programs",     href: "/editor/part2/d" },
    ],
  },
  {
    partNum: 3, part: "III", title: "Proposed ICT Strategy", color: "var(--part-3)",
    sections: [
      { id: "part3/a",  label: "A. Proposed Infrastructure",  href: "/editor/part3/a"  },
      { id: "part3/b",  label: "B. Enterprise Architecture",  href: "/editor/part3/b"  },
      { id: "part3/c",  label: "C. Proposed Human Capital",   href: "/editor/part3/c"  },
      { id: "part3/d",  label: "D. Proposed IS",              href: "/editor/part3/d"  },
      { id: "part3/e1", label: "E.1 Internal Projects",       href: "/editor/part3/e1" },
      { id: "part3/e2", label: "E.2 Cross-Agency Projects",   href: "/editor/part3/e2" },
      { id: "part3/f",  label: "F. Performance Framework",    href: "/editor/part3/f"  },
    ],
  },
  {
    partNum: 4, part: "IV", title: "Resource Requirements", color: "var(--part-4)",
    sections: [
      { id: "part4/year1",   label: "Year 1 Breakdown",       href: "/editor/part4/year1"   },
      { id: "part4/year2",   label: "Year 2 Breakdown",       href: "/editor/part4/year2"   },
      { id: "part4/year3",   label: "Year 3 Breakdown",       href: "/editor/part4/year3"   },
      { id: "part4/summary", label: "Summary of Investments", href: "/editor/part4/summary", readOnly: true },
    ],
  },
] as const;

export const ALL_SECTIONS: readonly SectionDef[] = PARTS.flatMap((p) => p.sections);

export const TOTAL_SECTIONS = ALL_SECTIONS.length; // 18

export function computeStatus(meta: SectionMeta | undefined): SectionStatus {
  if (!meta) return "empty";
  if (meta.userMarkedDone) return "done";
  if (meta.lastEditedAt) return "in_progress";
  return "empty";
}

export function computePartStatus(
  partSections: readonly SectionDef[],
  sectionMeta: Record<string, SectionMeta>
): SectionStatus {
  const statuses = partSections
    .filter((s) => !s.readOnly)
    .map((s) => computeStatus(sectionMeta[s.id]));
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.every((s) => s === "empty")) return "empty";
  return "in_progress";
}

/** Returns the section to continue from: most recent lastEditedAt → first section */
export function findContinueTarget(sectionMeta: Record<string, SectionMeta>): {
  section: SectionDef;
  part: PartDef;
  lastEditedAt: string | null;
} {
  let latest: { section: SectionDef; part: PartDef; ts: string } | null = null;

  for (const part of PARTS) {
    for (const section of part.sections) {
      const ts = sectionMeta[section.id]?.lastEditedAt;
      if (ts && (!latest || ts > latest.ts)) {
        latest = { section, part, ts };
      }
    }
  }

  if (latest) return { section: latest.section, part: latest.part, lastEditedAt: latest.ts };
  return { section: PARTS[0].sections[0], part: PARTS[0], lastEditedAt: null };
}
