import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BudgetDashboard } from "@/components/budget/budget-dashboard";
import { ScopedBudgetFrame } from "@/components/budget/budget-frame";

export const metadata: Metadata = pageMetadata({
  title: "ICT Budget Dashboard · demonstration preview",
  description:
    "ISSP-proposed ICT investment across agencies and years, with requests compared against allotments. Demonstration preview with a fictitious corpus.",
    path: "/budget",
});

export default function BudgetPage() {
  return (
    // The fallback keeps the frame visible while the search params resolve. It
    // goes through ScopedBudgetFrame, a client component that builds its empty
    // params itself: a URLSearchParams created here on the server would not
    // survive the serialization boundary.
    <Suspense
      fallback={
        <ScopedBudgetFrame active="home">
          <div aria-label="Loading the dashboard" className="h-96 rounded-xl bg-muted animate-pulse" />
        </ScopedBudgetFrame>
      }
    >
      <BudgetDashboard />
    </Suspense>
  );
}
