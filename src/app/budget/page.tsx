import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BudgetDashboard } from "@/components/budget/budget-dashboard";

export const metadata: Metadata = pageMetadata({
  title: "ICT Budget Dashboard · demonstration preview",
  description:
    "ISSP-proposed ICT investment across agencies and years, with requests compared against allotments. Demonstration preview with a fictitious corpus.",
  path: "/budget",
});

export default function BudgetPage() {
  return (
    <Suspense fallback={null}>
      <BudgetDashboard />
    </Suspense>
  );
}
