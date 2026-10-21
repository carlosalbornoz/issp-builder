/**
 * ICT spend domains: the roll-up of the 30 DICT expense categories into the
 * whole-of-government domain lens (devices, networks, cloud & software,
 * people & services). Purely derived from categories the current form already
 * carries — no new fields — which is the demo line: "the same 30 categories
 * DBM already knows, read as domains."
 *
 * Cybersecurity spend is deliberately NOT mapped: none of the 30 categories
 * is security-specific, so today's form cannot see it. That gap is the
 * "one field away" story on the cybersecurity view (a security tag per
 * project/line, proposed).
 *
 * AI & compute spend rides the aiLayer tag (also proposed), not categories.
 */

import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";

export type SpendDomainKey = "devices" | "networks" | "cloudSoftware" | "peopleServices";

export interface SpendDomain {
  key: SpendDomainKey;
  label: string;
  /** One-line what-this-covers description for view headers. */
  blurb: string;
  categoryIds: string[];
}

export const SPEND_DOMAINS: SpendDomain[] = [
  {
    key: "devices",
    label: "Compute devices",
    blurb: "Endpoints, printers, supplies and their maintenance and rents",
    categoryIds: [
      "co-ict-machinery-equipment",
      "co-printing-equipment",
      "mooe-semi-expendable-ict-equipment",
      "mooe-semi-expendable-printing-equipment",
      "mooe-ict-supplies",
      "mooe-rm-ict-equipment",
      "mooe-rm-printing-equipment",
      "mooe-rm-semi-ict",
      "mooe-rm-semi-printing",
      "mooe-rm-leased-ict",
      "mooe-rents-ict",
    ],
  },
  {
    key: "networks",
    label: "Networks and connectivity",
    blurb: "Communication equipment, internet, mobile, landline and radio",
    categoryIds: [
      "co-communication-equipment",
      "co-infrastructure-communications-network",
      "mooe-semi-expendable-communication-equipment",
      "mooe-mobile-expenses",
      "mooe-landline-expenses",
      "mooe-internet-subscription",
      "mooe-cable-satellite-radio",
      "mooe-rm-infra-communications-network",
      "mooe-rm-communication-equipment",
      "mooe-rm-semi-communication",
    ],
  },
  {
    key: "cloudSoftware",
    label: "Software, cloud and hosting",
    blurb: "Software purchases, subscriptions, cloud, data centre and web hosting",
    categoryIds: [
      "co-ict-software",
      "mooe-ict-software-subscription",
      "mooe-data-center-services",
      "mooe-cloud-computing",
      "mooe-web-hosting",
    ],
  },
  {
    key: "peopleServices",
    label: "People and services",
    blurb: "ICT training, professional services, research and other ICT services",
    categoryIds: [
      "mooe-ict-training",
      "mooe-professional-services",
      "mooe-ict-research",
      "mooe-other-general-ict-services",
    ],
  },
];

const BY_CATEGORY: Record<string, SpendDomainKey> = Object.fromEntries(
  SPEND_DOMAINS.flatMap((d) => d.categoryIds.map((id) => [id, d.key]))
);

/** The spend domain a category rolls up to, or undefined (never guessed). */
export function spendDomainOf(categoryId: string): SpendDomainKey | undefined {
  return BY_CATEGORY[categoryId];
}

const unmapped = EXPENSE_CATEGORIES.filter((c) => !BY_CATEGORY[c.id]);
if (unmapped.length > 0) {
  throw new Error(`ict-domains: unmapped expense categories: ${unmapped.map((c) => c.id).join(", ")}`);
}
