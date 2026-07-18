export const CURRENT_SCHEMA_VERSION = 10;

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
      return sourceSchemaVersion < 9;
    })
    .map((section) => section.id);
}
