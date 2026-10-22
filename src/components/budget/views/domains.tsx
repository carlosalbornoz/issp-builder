"use client";

/**
 * ICT domains hub: one card per domain view with its headline figure. Every
 * domain view reads the same filtered Part IV lines and corpus layers as the
 * rest of the dashboard.
 */

import { DOMAIN_KEYS, SCREENS, screenHref } from "../nav";
import { domainHeadline } from "./headlines";
import { TaskCard } from "./home";
import { ViewHeader, ViewProps } from "./shared";

export function DomainsView({ params, ...props }: ViewProps & { params: URLSearchParams }) {
  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.domains.label} lede={SCREENS.domains.summary} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOMAIN_KEYS.map((key) => (
          <TaskCard key={key} href={screenHref(key, params)} title={SCREENS[key].label} summary={SCREENS[key].summary} headline={domainHeadline(key, props)} mode={props.mode} />
        ))}
      </div>
    </div>
  );
}
