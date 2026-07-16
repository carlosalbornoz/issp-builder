import type { AgencyInfo } from "@/lib/store/types";

export type UsageEventType = "created" | "loaded" | "restored";

export function recordIsspUsage(event: UsageEventType, agency: AgencyInfo): void {
  const agencyName = agency.name.trim();
  const agencyAcronym = agency.acronym.trim();
  if (!agencyName || !agencyAcronym) return;

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  void fetch(`${basePath}/api/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, agencyName, agencyAcronym }),
    cache: "no-store",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Usage analytics are best-effort and must never interrupt document work.
  });
}
