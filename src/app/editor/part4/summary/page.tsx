"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4Summary } from "@/components/issp-editor/part4/part4-summary";
import type { Part4SummaryData } from "@/components/issp-editor/part4/part4-aggregations";
import { buildB1, buildB2, buildB3, buildB4, yearTotal } from "@/components/issp-editor/part4/part4-aggregations";
import type { YearBudget } from "@/components/issp-editor/part4/part4-year-form";

export default function Part4SummaryPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const years: [YearBudget, YearBudget, YearBudget] = [doc.part4.year1, doc.part4.year2, doc.part4.year3];
  const yearLabels: [string, string, string] = [
    `Year 1 (${doc.startYear})`,
    `Year 2 (${doc.startYear + 1})`,
    `Year 3 (${doc.endYear})`,
  ];

  const data: Part4SummaryData = {
    yearLabels,
    b1: buildB1(years),
    b2: buildB2(years),
    b3: buildB3(years),
    b4: buildB4(years),
    grandTotals: years.map(yearTotal) as [number, number, number],
  };

  return <Part4Summary data={data} />;
}
