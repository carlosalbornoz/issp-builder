/**
 * Single source of truth for enum → display-label maps, shared by the editor
 * forms and the PDF export route. The label strings for classification must
 * match the comparison strings in the PDF renderer's checkbox rows exactly.
 */

export const CLASSIFICATION_LABELS = {
  SUPPORT_TO_OPERATIONS: "Support to Operations",
  GENERAL_ADMIN: "General Administrative Systems",
  OPERATIONS: "Operations",
} as const;

export type IsClassification = keyof typeof CLASSIFICATION_LABELS | "";

export const DEV_STRATEGY_LABELS = {
  IN_HOUSE: "In-House Development",
  OUTSOURCED: "Outsourced",
  HYBRID: "Combination (In-house + Outsourced)",
  COTS: "Commercial Off-The-Shelf (COTS)",
  OPEN_SOURCE: "Open Source",
} as const;

export const DATA_STORAGE_LABELS = {
  ON_PREMISE: "On-Premise",
  CLOUD: "Cloud",
  HYBRID: "Hybrid",
} as const;

export const DEPLOYMENT_LABELS = {
  ON_PREMISE: "On-Premise",
  CLOUD: "Cloud-Hosted",
  HYBRID: "Hybrid",
  HOSTED: "Hosted (3rd Party)",
} as const;

/** Resolve an enum code to its display label; passes unknown/legacy values through. */
export function labelFor(map: Record<string, string>, code: string | undefined | null): string {
  if (!code) return "";
  return map[code] ?? code;
}

export const CLASSIFICATION_OPTIONS = (
  Object.entries(CLASSIFICATION_LABELS) as [keyof typeof CLASSIFICATION_LABELS, string][]
).map(([value, label]) => ({ value, label }));
