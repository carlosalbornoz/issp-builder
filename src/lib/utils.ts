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
