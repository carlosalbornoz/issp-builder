import { CYBER_GROUPS } from "@/lib/cyber-controls";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import {
  CLASSIFICATION_LABELS,
  DATA_STORAGE_LABELS,
  DEV_STRATEGY_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  FRONTLINE_ACCESS_LABELS,
  PROPOSED_STATUS_LABELS,
} from "@/lib/issp-labels";
import { rowName, type CellDiff } from "@/lib/scope/merge-review";
import { php } from "@/lib/utils";

/**
 * Words for merge-review values and cell paths. The review never shows raw
 * JSON: every value is turned into text a focal person can read.
 */

const KEY_LABELS: Record<string, string> = {
  it: "IT",
  nonIt: "Non-IT",
  qty: "Quantity",
  unitCost: "Unit cost",
  categoryId: "Expense category",
  url: "URL",
  pia: "Privacy Impact Assessment",
  plantillaUnfilled: "Plantilla (Unfilled)",
  eGovPay: "eGovPay",
  pnpki: "PNPKI",
  hcmis: "HCMIS",
  ifmis: "IFMIS",
  elgu: "eLGU",
  pscp: "PSCP",
  onlinePortal: "Online Portal",
  recordsMgmt: "Records Management",
  ifNo: "If No",
  year1Target: "Year 1 target",
  year2Target: "Year 2 target",
  year3Target: "Year 3 target",
  year1Deliverables: "Year 1 deliverables",
  year2Deliverables: "Year 2 deliverables",
  year3Deliverables: "Year 3 deliverables",
};

/** Stored codes that have a template label. */
const CODE_LABELS: Record<string, Record<string, string>> = {
  classification: CLASSIFICATION_LABELS,
  developmentStrategy: DEV_STRATEGY_LABELS,
  dataStorage: DATA_STORAGE_LABELS,
  status: PROPOSED_STATUS_LABELS,
  frontlineAccessType: FRONTLINE_ACCESS_LABELS,
  employmentStatus: EMPLOYMENT_STATUS_LABELS,
  categoryId: Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c.name])),
};

export function humanizeKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A readable label for a changed cell, using template labels where the field has them. */
export function cellLabel(fieldKey: string, cell: CellDiff): string {
  if (fieldKey === "cybersecurityControls" || fieldKey === "proposedCybersecControls") {
    const group = CYBER_GROUPS.find((g) => g.key === cell.path[0]);
    const item = group?.items.find((i) => i.key === cell.path[1]);
    if (group && item) return `${group.label} › ${item.label}`;
  }
  return cell.path.map(humanizeKey).join(" › ");
}

/** Plain text of a rich-text (HTML) value, for word comparison. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export const EMPTY = "(empty)";

/**
 * Any stored value as text. `key` (the field or cell key) lets stored codes
 * show their template label. Never returns JSON.
 */
export function formatValue(value: unknown, key?: string, depth = 0): string {
  if (value === undefined || value === null || value === "") return EMPTY;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-PH");
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "(image)";
    if (key && CODE_LABELS[key]?.[value]) return CODE_LABELS[key][value];
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY;
    if (value.every((v) => typeof v !== "object" || v === null)) return value.map((v) => formatValue(v, key)).join(", ");
    return value.map((v) => rowName(v)).join(", ");
  }
  if (typeof value === "object") {
    if (depth >= 2) return "…";
    const parts = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => k !== "id" && formatValue(v, k, depth + 1) !== EMPTY)
      .map(([k, v]) => `${humanizeKey(k)}: ${formatValue(v, k, depth + 1)}`);
    return parts.length > 0 ? parts.join("; ") : EMPTY;
  }
  return String(value);
}

/** A Part IV line item's cost line: "3 × ₱1,000.00 = ₱3,000.00". */
export function lineItemCost(row: unknown): { text: string; total: number } | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as { qty?: unknown; unitCost?: unknown };
  if (typeof r.qty !== "number" || typeof r.unitCost !== "number") return null;
  const total = r.qty * r.unitCost;
  return { text: `${r.qty.toLocaleString("en-PH")} × ${php(r.unitCost)} = ${php(total)}`, total };
}

/** Signed peso difference: "+₱2,000.00" / "−₱500.00". */
export function signedPhp(delta: number): string {
  if (delta === 0) return php(0);
  return `${delta > 0 ? "+" : "−"}${php(Math.abs(delta))}`;
}
