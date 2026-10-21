import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function php(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n || 0);
}

/** Compact dashboard figures: ₱1.35B / ₱427.3M / ₱85K. */
export function phpCompact(n: number): string {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${Math.round(n / 1_000)}K`;
  return php(n);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date ("2026-09-18" or a full timestamp) → "18 Sep 2026", the corpus note style. */
export function formatDay(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Corpus "2024-07" → "Jul 2024"; empty for a missing value. */
export function formatMonth(ym?: string): string {
  if (!ym) return "";
  const d = new Date(`${ym}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return ym;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
