import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BudgetDashboard } from "@/components/budget/budget-dashboard";
import { BudgetFrame } from "@/components/budget/budget-frame";

export const metadata: Metadata = pageMetadata({
  title: "ICT Budget Dashboard · demonstration preview",
  description:
    "ISSP-proposed ICT investment across agencies and years, with requests compared against allotments. Demonstration preview with a fictitious corpus.",
    path: "/budget",
});

const FALLBACK_PARAMS = new URLSearchParams();

export default function BudgetPage() {
  return (
    // The fallback keeps the frame visible while the search params resolve, the
    // same shape ScopedBudgetFrame uses for the pages beside the dashboard.
    <Suspense
      fallback={
        <BudgetFrame active="home" params={FALLBACK_PARAMS}>
          <div aria-label="Loading the dashboard" className="h-96 rounded-xl bg-muted animate-pulse" />
        </BudgetFrame>
      }
    >
      <BudgetDashboard />
    </Suspense>
  );
}
