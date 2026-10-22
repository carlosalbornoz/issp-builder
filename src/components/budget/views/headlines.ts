/**
 * One headline figure per screen, for the Home and ICT domains cards. Each is
 * computed the way its screen computes it (same scope, same filters), so a card
 * never disagrees with the screen it opens. `locked` marks a figure that needs a
 * proposed field or link: in current-form mode the card shows the lock instead.
 */

import { SPEND_DOMAINS, type SpendDomainKey } from "@/lib/ict-domains";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { PROPOSED_REFINEMENT_COUNT } from "@/lib/repository/data-standard";
import { phpCompact } from "@/lib/utils";
import type { ScreenKey } from "../nav";
import { absorptiveRows } from "./absorptive";
import { duplicationGroups } from "./shared-services";
import { pct, type ViewProps } from "./shared";

export interface Headline {
  value: string;
  detail: string;
  /** Needs a proposed field or link (locks in current-form mode). */
  proposed?: boolean;
}

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

const fyScope = ({ lines, fy }: ViewProps) => (fy === "all" ? lines : lines.filter((l) => l.year === fy));
const fyWords = ({ fy }: ViewProps) => (fy === "all" ? "all plan years" : `FY${fy}`);
/** Money with the en-dash null: nothing in scope reads "–", never "₱0.00". */
const money = (n: number) => (n > 0 ? phpCompact(n) : "–");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function spendTotal(props: ViewProps, key: SpendDomainKey) {
  const ids = SPEND_DOMAINS.find((d) => d.key === key)!.categoryIds;
  return fyScope(props)
    .filter((l) => ids.includes(l.categoryId))
    .reduce((s, l) => s + l.total, 0);
}

function gaaAgencies({ corpus, profiles }: ViewProps) {
  const slugs = new Set(profiles.map((p) => p.slug));
  return corpus.compass.agencies.filter((ca) => ca.route === "GAA" && slugs.has(ca.slug));
}

/** The ICT domain views' headline figures. */
export function domainHeadline(key: ScreenKey, props: ViewProps): Headline {
  const { corpus, profiles, lines } = props;
  switch (key) {
    case "cybersecurity": {
      const bySlug = new Map(corpus.cyber.agencies.map((a) => [a.slug, a.overall]));
      const shares = profiles.map((p) => bySlug.get(p.slug)).filter((v): v is number => v !== undefined);
      const avg = shares.length ? shares.reduce((s, v) => s + v, 0) / shares.length : 0;
      return { value: shares.length ? `${Math.round(avg * 100)}%` : "–", detail: "Part II-B controls in place, selection average" };
    }
    case "devices":
      return { value: money(spendTotal(props, "devices")), detail: `device spending, ${fyWords(props)}` };
    case "networks":
      return { value: money(spendTotal(props, "networks")), detail: `connectivity spending, ${fyWords(props)}` };
    case "cloud":
      return { value: money(spendTotal(props, "cloudSoftware")), detail: `cloud and software spending, ${fyWords(props)}` };
    case "ai": {
      const total = corpus.aiLayer.projects.reduce(
        (s, p) => s + lines.filter((l) => l.slug === p.slug && l.projectId === p.projectId).reduce((t, l) => t + l.total, 0),
        0
      );
      return { value: money(total), detail: "tagged AI and compute requests", proposed: true };
    }
    case "people":
      return { value: profiles.reduce((s, p) => s + p.humanCapital.totalIt, 0).toLocaleString("en-PH"), detail: "ICT personnel (Part I)" };
    case "services": {
      const total = profiles.reduce((s, p) => s + p.egp.total, 0);
      const adopted = profiles.reduce((s, p) => s + p.egp.adopted, 0);
      return { value: pct(adopted, total), detail: "eGovPH program adoption" };
    }
    case "shared": {
      const n = duplicationGroups(profiles).length;
      return { value: String(n), detail: n === 1 ? "duplicate system cluster" : "duplicate system clusters" };
    }
    default:
      return { value: "–", detail: "" };
  }
}

/** The Home cards' headline figures. */
export function homeHeadline(key: ScreenKey | "dataStandard", props: ViewProps, fyLabel: string): Headline {
  const { profiles } = props;
  const sectors = new Set(profiles.map((p) => p.sector)).size;
  switch (key) {
    case "posture":
      return { value: String(profiles.length), detail: `${plural(profiles.length, "agency", "agencies")} in ${sectors} ${plural(sectors, "sector", "sectors")}` };
    case "sectors":
      return { value: String(sectors), detail: `${plural(sectors, "PDP sector", "PDP sectors")} in scope` };
    case "domains":
      return { value: "8", detail: "domain views" };
    case "ask": {
      const scope = fyScope(props);
      return { value: money(scope.reduce((s, l) => s + l.total, 0)), detail: `proposed, ${fyLabel}` };
    }
    case "buys": {
      const byCategory = new Map<string, number>();
      fyScope(props).forEach((l) => byCategory.set(l.categoryId, (byCategory.get(l.categoryId) ?? 0) + l.total));
      const [top] = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
      const total = [...byCategory.values()].reduce((s, v) => s + v, 0);
      return top
        ? { value: pct(top[1], total), detail: `${categoryNameById.get(top[0]) ?? "Uncategorized"}, the largest category` }
        : { value: "–", detail: "no line items in scope" };
    }
    case "money": {
      const gaa = gaaAgencies(props);
      const sum = (field: "allotment" | "obligated") => gaa.reduce((s, ca) => s + (ca.years.find((y) => y.year === 2025)?.[field] ?? 0), 0);
      return gaa.length
        ? { value: pct(sum("obligated"), sum("allotment")), detail: "of FY2025 ICT allotments obligated", proposed: true }
        : { value: "–", detail: "no GAA agencies in scope", proposed: true };
    }
    case "absorptive": {
      const rows = absorptiveRows(gaaAgencies(props), profiles);
      const low = rows.filter((r) => r.y25.obligated! / r.y25.allotment! < 0.7).length;
      return rows.length
        ? { value: `${low} of ${rows.length}`, detail: `${plural(rows.length, "agency", "agencies")} below 70% FY2025 obligation`, proposed: true }
        : { value: "–", detail: "no FY2025 execution records in scope", proposed: true };
    }
    case "agencies":
      return { value: String(profiles.length), detail: profiles.length === 1 ? "agency ISSP" : "agency ISSPs" };
    case "dataStandard":
      return { value: String(PROPOSED_REFINEMENT_COUNT), detail: "proposed form refinements" };
    default:
      return domainHeadline(key, props);
  }
}
