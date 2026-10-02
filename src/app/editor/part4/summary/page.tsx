"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4Summary } from "@/components/issp-editor/part4/part4-summary";
import { buildPart4Summary } from "@/components/issp-editor/part4/part4-aggregations";

export default function Part4SummaryPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  // Counted budget only (part4-aggregations countedPart4) — same totals as the PDF
  const data = buildPart4Summary(doc);

  return <Part4Summary data={data} />;
}
