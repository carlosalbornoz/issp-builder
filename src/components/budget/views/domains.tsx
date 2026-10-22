"use client";

/**
 * ICT domains hub: one entry per domain view. Every domain view reads the same
 * filtered Part IV lines and corpus layers as the rest of the dashboard.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Panel } from "./shared";

const DOMAIN_LINKS = [
  { href: "/budget?view=cybersecurity", label: "Cybersecurity", desc: "Part II-B controls, fleet exposure, advisory blast radius" },
  { href: "/budget?view=devices", label: "Devices", desc: "the estate, unit-price sanity, device spend" },
  { href: "/budget?view=networks", label: "Networks", desc: "connectivity spend and the links the plans name" },
  { href: "/budget?view=cloud", label: "Cloud & software", desc: "storage mix, hosting spend, cloud-first" },
  { href: "/budget?view=ai", label: "AI & compute", desc: "tagged asks, own-build versus shared" },
  { href: "/budget?view=people", label: "People", desc: "ICT workforce and capability spend" },
  { href: "/budget?view=services", label: "eGov services", desc: "eGovPH adoption, PNPKI, online reach" },
  { href: "/budget?view=money", label: "Money & execution", desc: "follow every peso, absorptive capacity" },
  { href: "/budget?view=shared", label: "Shared services", desc: "duplication watch, cross-agency programs" },
];

export function DomainsView() {
  return (
    <Panel title="Explore by domain" sub="every view reads the same fields">
      <div className="space-y-1">
        {DOMAIN_LINKS.map((v) => (
          <Link key={v.href} href={v.href} className="flex items-baseline justify-between gap-2 rounded-md px-2.5 -mx-2.5 py-1.5 hover:bg-accent/40 transition-colors">
            <span className="min-w-0">
              <span className="text-sm font-medium">{v.label}</span>
              <span className="block text-[11px] text-muted-foreground leading-snug">{v.desc}</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 self-center" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}
