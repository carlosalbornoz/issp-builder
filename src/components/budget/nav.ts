/**
 * The dashboard's screen registry: every ?view= key, its formal label, its
 * sidebar group and the one-line summary that Home and the ICT domains hub
 * show on its card. The sidebar, breadcrumb, Home cards and legacy-link
 * resolver all read this one table, so a label changes in one place.
 */

export type ScreenKey =
  | "home"
  | "posture"
  | "sectors"
  | "ask"
  | "buys"
  | "domains"
  | "cybersecurity"
  | "devices"
  | "networks"
  | "cloud"
  | "ai"
  | "people"
  | "services"
  | "shared"
  | "money"
  | "absorptive"
  | "agencies";

export type NavGroup = "overview" | "investment" | "domains" | "execution" | "agencies" | "resources";

import { BookOpen, Building2, ChartPie, ClipboardCheck, Cloud, Coins, Cpu, FileJson, Gauge, Globe, Laptop, Layers3, LayoutGrid, MonitorSmartphone, Network, ReceiptText, Route, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SECTOR_LABELS } from "@/lib/repository/corpus";

/**
 * The scope line beside the breadcrumb: names the sector or agency a screen is
 * scoped to, so a filtered screen never reads as the whole government. The
 * agency acronym comes from the slug prefix (corpus convention: every slug
 * starts with the acronym, e.g. ncra-2027-2029 -> NCRA).
 */
export function scopeNote(params: URLSearchParams): { kind: "sector" | "agency"; label: string } | null {
  const agency = params.get("agency");
  if (agency) return { kind: "agency", label: agency.split("-")[0]?.toUpperCase() ?? agency };
  const sector = params.get("sector");
  if (sector && SECTOR_LABELS[sector]) return { kind: "sector", label: SECTOR_LABELS[sector] };
  return null;
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  overview: "Overview",
  investment: "Investment",
  domains: "ICT domains",
  execution: "Budget execution",
  agencies: "Agencies",
  resources: "Resources",
};

/** One icon per sidebar group; reinforces the label (KPI-eyebrow size), never replaces it. */
export const NAV_GROUP_ICONS: Record<NavGroup, LucideIcon> = {
  overview: Globe,
  investment: Coins,
  domains: LayoutGrid,
  execution: Route,
  agencies: Building2,
  resources: BookOpen,
};

export const SCREENS: Record<ScreenKey, { label: string; group: NavGroup | null; summary: string; icon?: LucideIcon }> = {
  home: { label: "Home", group: null, summary: "ICT investment plans of the whole of government, by area." },
  posture: {
    label: "Government-wide posture",
    group: "overview",
    summary: "Cyber controls, cloud hosting, continuing costs, device support and execution, by agency.",
    icon: ClipboardCheck,
  },
  sectors: { label: "Sector comparison", group: "overview", summary: "Planned ICT investment by PDP 2023-2028 sector.", icon: ChartPie },
  ask: { label: "Investment summary", group: "investment", summary: "Proposed ICT investment by year, expense class and fund\u00A0source.", icon: Coins },
  buys: { label: "Expenditure by category", group: "investment", summary: "Proposed ICT investment by DICT expense category.", icon: ReceiptText },
  domains: { label: "ICT domains", group: "domains", summary: "Spending and readiness in each ICT domain.", icon: LayoutGrid },
  cybersecurity: { label: "Cybersecurity", group: "domains", summary: "Part II-B controls, fleet exposure and advisory impact.", icon: ShieldCheck },
  devices: { label: "Devices", group: "domains", summary: "Device estate, unit prices and device spending.", icon: Laptop },
  networks: { label: "Networks", group: "domains", summary: "Connectivity spending and planned network links.", icon: Network },
  cloud: { label: "Cloud and software", group: "domains", summary: "Storage mix, hosting spending and cloud adoption.", icon: Cloud },
  ai: { label: "AI and compute", group: "domains", summary: "Tagged AI and compute requests, own-build and shared.", icon: Cpu },
  people: { label: "ICT workforce", group: "domains", summary: "ICT staff complement and capability spending.", icon: Users },
  services: { label: "eGovernment services", group: "domains", summary: "eGovPH adoption, PNPKI use and online service\u00A0reach.", icon: MonitorSmartphone },
  shared: { label: "Shared services", group: "domains", summary: "Duplicate systems and cross-agency programs.", icon: Layers3 },
  money: {
    label: "Plan to obligation",
    group: "execution",
    summary: "ISSP request through NEP, GAA, allotment, obligation and\u00A0disbursement.",
    icon: Route,
  },
  absorptive: { label: "Absorptive capacity", group: "execution", summary: "FY2025 obligation rates against the FY2027 request.", icon: Gauge },
  agencies: { label: "Agency ISSPs", group: "agencies", summary: "Proposed investment by agency, with links to each\u00A0ISSP.", icon: Building2 },
};

/** Pages outside the ?view= switch that the sidebar also lists. */
export type ExternalItem = "dataStandard" | "examiner" | "citizen";

export const EXTERNAL_ITEMS: Record<ExternalItem, { label: string; href: string; summary: string; icon?: LucideIcon }> = {
  dataStandard: {
    label: "Data standard",
    href: "/budget/data-standard",
    summary: "Fields each dashboard view reads, and the refinements that unlock the rest.",
    icon: FileJson,
  },
  examiner: { label: "Examiner brief", href: "/budget/report/examiner", summary: "One-page agency brief for budget review." },
  citizen: { label: "Citizen summary", href: "/budget/report/citizen", summary: "Plain-language one-page summary." },
};

export const NAV: { group: NavGroup; items: (ScreenKey | ExternalItem)[] }[] = [
  { group: "overview", items: ["posture", "sectors"] },
  { group: "investment", items: ["ask", "buys"] },
  { group: "domains", items: ["cybersecurity", "devices", "networks", "cloud", "ai", "people", "services", "shared"] },
  { group: "execution", items: ["money", "absorptive"] },
  { group: "agencies", items: ["agencies"] },
  { group: "resources", items: ["dataStandard", "examiner", "citizen"] },
];

export const DOMAIN_KEYS: ScreenKey[] = ["cybersecurity", "devices", "networks", "cloud", "ai", "people", "services", "shared"];

export const isScreenKey = (value: string): value is ScreenKey => Object.prototype.hasOwnProperty.call(SCREENS, value);
export const isExternalItem = (value: string): value is ExternalItem => Object.prototype.hasOwnProperty.call(EXTERNAL_ITEMS, value);

/**
 * The screen a URL opens. Old links keep working: a bare /budget and the
 * retired ?view=overview open Home, and an ?agency= link without a view (the
 * repository record's "see in dashboard") opens that agency's Investment summary.
 */
export function resolveScreen(view: string | null, agency: string | null): ScreenKey {
  if (view && isScreenKey(view)) return view;
  return agency && (!view || view === "overview") ? "ask" : "home";
}

/** The scope keys that travel to the pages beside the dashboard (data standard, trace). */
const SCOPE_KEYS = ["sector", "agency", "mode", "fy", "cycle", "type", "fund", "class", "bucket"] as const;

/** Append the carried scope keys to an href outside /budget (data standard, trace). */
export function withScope(href: string, params: URLSearchParams, keys: readonly string[] = SCOPE_KEYS): string {
  const next = new URLSearchParams();
  keys.forEach((k) => {
    const v = params.get(k);
    if (v) next.set(k, v);
  });
  const qs = next.toString();
  return qs ? `${href}${href.includes("?") ? "&" : "?"}${qs}` : href;
}

/**
 * A link to a page beside the dashboard. The data standard carries the scope so
 * its sidebar can lead back to the same lens; the examiner brief reads ?agency=.
 */
export function externalHref(item: ExternalItem, params: URLSearchParams): string {
  const keys = item === "dataStandard" ? SCOPE_KEYS : item === "examiner" ? (["agency"] as const) : [];
  return withScope(EXTERNAL_ITEMS[item].href, params, keys);
}

/** A link to a screen that keeps the current scope (sector, agency, mode). */
export function screenHref(key: ScreenKey, params: URLSearchParams): string {
  const next = new URLSearchParams(params.toString());
  // Home drops ?view= for a clean URL, except under an agency scope, where a
  // bare ?agency= link means that agency's Investment summary.
  if (key === "home" && !next.has("agency")) next.delete("view");
  else next.set("view", key);
  if (key !== "shared") next.delete("program");
  const qs = next.toString();
  return qs ? `/budget?${qs}` : "/budget";
}
