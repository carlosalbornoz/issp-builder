"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4YearForm } from "@/components/issp-editor/part4/part4-year-form";
import { yearsBetween, durationCoversYear } from "@/lib/duration";

export default function Part4Year1Page() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const year = String(doc.startYear);
  const planYears = yearsBetween(doc.startYear, doc.endYear);
  const inDuration = (duration: string) => durationCoversYear(duration ?? "", year, planYears);

  return (
    <Part4YearForm
      year={doc.startYear}
      yearKey="year1"
      initialData={doc.part4.year1}
      internalProjects={doc.part3.internalProjects.filter((p) => inDuration(p.duration)).map((p) => ({ id: p.id, title: p.title }))}
      crossAgencyProjects={doc.part3.crossAgencyProjects.filter((p) => inDuration(p.duration)).map((p) => ({ id: p.id, title: p.title }))}
      hideNonProjectCategories={doc.editScope?.projectIds !== undefined}
      liveProjectIds={[...doc.part3.internalProjects, ...doc.part3.crossAgencyProjects].map((p) => p.id)}
    />
  );
}
