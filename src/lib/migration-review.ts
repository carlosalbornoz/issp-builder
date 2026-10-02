import type { IsspDocument } from "./store/types";

export const CURRENT_SCHEMA_VERSION = 14;

export const MIGRATION_REVIEW_SECTIONS = [
  {
    id: "part1/c",
    shortLabel: "I-C",
    label: "Part I-C · Stakeholder Analysis",
    href: "/editor/part1/c",
    reason: "Every transaction/service must now be tagged Incoming or Outgoing, matching the current template.",
  },
  {
    id: "part2/c",
    shortLabel: "II-C",
    label: "Part II-C · Existing IS Inventory",
    href: "/editor/part2/c",
    reason: "Classification and Frontline Service now follow the current Online / On-premise / Hybrid structure.",
  },
  {
    id: "part2/d",
    shortLabel: "II-D",
    label: "Part II-D · E-Government Programs",
    href: "/editor/part2/d",
    reason: "The checklist now uses the current Yes / No questions and official follow-up fields.",
  },
  {
    id: "part3/d",
    shortLabel: "III-D",
    label: "Part III-D · Proposed Information Systems",
    href: "/editor/part3/d",
    reason: "Classification, Frontline access, interoperability, and PIA fields were aligned to the current template.",
  },
  {
    id: "part1/b",
    shortLabel: "I-B",
    label: "Part I-B · Organizational Structure",
    href: "/editor/part1/b",
    reason: "DICT quietly released an updated ISSP template on September 15 — Plantilla positions are now reported as Filled and Unfilled counts instead of one total. Old files default Unfilled to 0; please enter your agency's real vacancy count.",
  },
  {
    id: "part4/categories",
    shortLabel: "IV",
    label: "Part IV · Expense Categories",
    href: "/editor/part4/cycle",
    reason: "UACS codes were replaced by the 30 official DICT expense categories. Items whose old code had no matching category are highlighted in Part IV — open each one and pick its category.",
  },
] as const;

export type MigrationReviewSectionId = (typeof MIGRATION_REVIEW_SECTIONS)[number]["id"];

export function getMigrationReviewSection(id: string) {
  return MIGRATION_REVIEW_SECTIONS.find((section) => section.id === id);
}

/** Sections whose meaning changed after the given schema version. */
export function getRequiredMigrationReviewSectionIds(sourceSchemaVersion: number): MigrationReviewSectionId[] {
  return MIGRATION_REVIEW_SECTIONS
    .filter((section) => {
      if (section.id === "part2/d") return sourceSchemaVersion < 7;
      if (section.id === "part1/c") return sourceSchemaVersion < 10;
      if (section.id === "part1/b") return sourceSchemaVersion < 13;
      if (section.id === "part4/categories") return false; // doc-aware only — see below
      return sourceSchemaVersion < 9;
    })
    .map((section) => section.id);
}

/** True when any Part IV line item has no expense category set. */
export function hasUncategorizedPart4Lines(doc: IsspDocument): boolean {
  const buckets = (year: IsspDocument["part4"]["year1"]) => [
    ...year.officeProductivity.capitalOutlay,
    ...year.officeProductivity.mooe,
    ...Object.values(year.internalProjects).flatMap((p) => [...p.capitalOutlay, ...p.mooe]),
    ...Object.values(year.crossAgencyProjects).flatMap((p) => [...p.capitalOutlay, ...p.mooe]),
    ...year.continuingCosts.mooe,
  ];
  const { year1, year2, year3 } = doc.part4;
  return [year1, year2, year3].some((y) => buckets(y).some((l) => !l.categoryId));
}

/**
 * Doc-aware variant: same as getRequiredMigrationReviewSectionIds, plus the
 * Part IV category review — required only when a pre-v14 file still has
 * uncategorized line items after migration (unknown or mismatched UACS codes).
 */
export function getRequiredMigrationReviewSectionIdsForDoc(
  sourceSchemaVersion: number,
  doc: IsspDocument
): MigrationReviewSectionId[] {
  const ids = getRequiredMigrationReviewSectionIds(sourceSchemaVersion);
  if (sourceSchemaVersion < 14 && hasUncategorizedPart4Lines(doc)) {
    return [...ids, "part4/categories"];
  }
  return ids;
}
