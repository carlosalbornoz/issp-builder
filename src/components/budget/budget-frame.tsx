"use client";

/**
 * The dashboard frame: a persistent sidebar (xl and up) or a navigation drawer
 * (below xl), a breadcrumb, and a sticky toolbar slot for the scope controls.
 * Every /budget surface renders inside it, so Home and every other screen stay
 * one click away. Labels and grouping come from the nav registry.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, House, Menu } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EXTERNAL_ITEMS, NAV, NAV_GROUP_LABELS, SCREENS, externalHref, isScreenKey, scopeNote, screenHref, type ExternalItem, type ScreenKey } from "./nav";
import { SECTOR_LABELS } from "@/lib/repository/corpus";

/** The surface the frame wraps: a dashboard screen, or one of the pages beside it. */
export type FrameActive = ScreenKey | "dataStandard" | "trace";

export function BudgetFrame({
  active,
  params,
  toolbar,
  children,
}: {
  active: FrameActive;
  /** The current query, so sidebar links keep the scope (sector, agency, mode). */
  params: URLSearchParams;
  /** Sticky controls above the screen (the scope bar); omitted on pages without filters. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // The data standard and trace pages sit inside the dashboard, so the header marks the dashboard.
    <PublicShell active="budget" width="dashboard">
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 flex gap-8">
        {/* A div, not <aside>: globals.css re-themes every <aside> as the
            editor's navy sidebar under the bettergov theme. */}
        <div className="hidden xl:block w-58 shrink-0">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-4 -mx-1 px-1">
            <SidebarNav active={active} params={params} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0",
              !toolbar && "xl:hidden"
            )}
          >
            <div className="flex items-center gap-2 py-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open dashboard menu"
                aria-expanded={drawerOpen}
                aria-haspopup="dialog"
                className="xl:hidden inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-2.5 sm:px-3 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Menu className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Menu</span>
              </button>
              <Link
                href={screenHref("home", params)}
                aria-label="Dashboard home"
                className="xl:hidden inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <House className="w-4 h-4" aria-hidden />
              </Link>
              {toolbar ? <div className="min-w-0 flex-1">{toolbar}</div> : null}
            </div>
          </div>

          <div className="py-6" data-screen-col>
            <Breadcrumb active={active} params={params} />
            {children}
          </div>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] gap-0 overflow-y-auto p-4">
          <SheetTitle className="text-sm font-semibold mb-2">ICT Budget Dashboard</SheetTitle>
          <SidebarNav active={active} params={params} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </PublicShell>
  );
}

const NO_SCOPE = new URLSearchParams();

/**
 * The frame for pages beside the dashboard (data standard, trace): it reads the
 * scope from the URL so the sidebar leads back to the same lens. useSearchParams
 * sits inside a Suspense boundary; the fallback is the same frame, unscoped.
 */
export function ScopedBudgetFrame({ active, children }: { active: FrameActive; children: React.ReactNode }) {
  return (
    <Suspense fallback={<BudgetFrame active={active} params={NO_SCOPE}>{children}</BudgetFrame>}>
      <FrameWithScope active={active}>{children}</FrameWithScope>
    </Suspense>
  );
}

function FrameWithScope({ active, children }: { active: FrameActive; children: React.ReactNode }) {
  const params = useSearchParams();
  return (
    <BudgetFrame active={active} params={params}>
      {children}
    </BudgetFrame>
  );
}

function itemHref(item: ScreenKey | ExternalItem, params: URLSearchParams) {
  return isScreenKey(item) ? screenHref(item, params) : externalHref(item, params);
}

function itemLabel(item: ScreenKey | ExternalItem) {
  return isScreenKey(item) ? SCREENS[item].label : EXTERNAL_ITEMS[item].label;
}

/** The trace page belongs to Plan to obligation; everything else marks itself. */
function isCurrent(item: ScreenKey | ExternalItem, active: FrameActive) {
  return item === active || (active === "trace" && item === "money");
}

function SidebarNav({ active, params, onNavigate }: { active: FrameActive; params: URLSearchParams; onNavigate?: () => void }) {
  const linkCls = (on: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md px-2.5 py-1 text-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      on ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    );

  return (
    <nav aria-label="Dashboard" className="text-sm">
      <Link
        href={screenHref("home", params)}
        onClick={onNavigate}
        aria-current={active === "home" ? "page" : undefined}
        className={linkCls(active === "home")}
      >
        <House className="w-4 h-4" aria-hidden />
        Home
      </Link>
      {NAV.map(({ group, items }) => (
        <div key={group} className="mt-4">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {NAV_GROUP_LABELS[group]}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const on = isCurrent(item, active);
              return (
                <li key={item}>
                  <Link href={itemHref(item, params)} onClick={onNavigate} aria-current={on ? (item === active ? "page" : "true") : undefined} className={linkCls(on)}>
                    {itemLabel(item)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="px-2.5 mt-2 text-[11px] text-muted-foreground">Demonstration · fictitious data</p>
    </nav>
  );
}

function Breadcrumb({ active, params }: { active: FrameActive; params: URLSearchParams }) {
  if (active === "home") return null;
  const trail: { label: string; href?: string }[] = [{ label: "Home", href: screenHref("home", params) }];
  if (active === "dataStandard") {
    trail.push({ label: EXTERNAL_ITEMS.dataStandard.label });
  } else if (active === "trace") {
    trail.push({ label: SCREENS.money.label, href: screenHref("money", params) }, { label: "Project trace" });
  } else if (active === "posture" && params.get("sector")) {
    // A sector drill-down: the trail names the lens and the screen it came from.
    trail.push(
      { label: SCREENS.sectors.label, href: screenHref("sectors", params) },
      { label: SECTOR_LABELS[params.get("sector") ?? ""] ?? SCREENS.posture.label }
    );
  } else {
    const group = SCREENS[active].group;
    // Only the ICT domains group has a page of its own (the hub); every other
    // group name would be a dead crumb, so it is not shown.
    if (group === "domains" && active !== "domains") {
      trail.push({ label: NAV_GROUP_LABELS.domains, href: screenHref("domains", params) });
    }
    trail.push({ label: SCREENS[active].label });
  }
  const note = scopeNote(params);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.label} className="inline-flex items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-foreground hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "text-foreground font-medium")}>
                  {crumb.label}
                </span>
              )}
              {!last ? <ChevronRight className="w-3 h-3" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      </nav>
      {note ? (
        <p data-scope-note className="text-xs text-muted-foreground">
          {note.kind === "sector" ? "Sector" : "Agency"}: {note.label}
        </p>
      ) : null}
    </div>
  );
}
