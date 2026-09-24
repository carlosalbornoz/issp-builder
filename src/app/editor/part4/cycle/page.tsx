"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4CycleView } from "@/components/issp-editor/part4/part4-cycle-view";
import { yearsBetween } from "@/lib/duration";

export default function Part4CyclePage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const planYears = yearsBetween(doc.startYear, doc.endYear) as [string, string, string];

  return (
    <Part4CycleView
      part4={doc.part4}
      planYears={planYears}
      internalProjects={doc.part3.internalProjects}
      crossAgencyProjects={doc.part3.crossAgencyProjects}
      hideNonProjectCategories={doc.editScope?.projectIds !== undefined}
    />
  );
}
