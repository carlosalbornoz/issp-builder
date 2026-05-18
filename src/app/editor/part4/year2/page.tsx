"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part4YearForm } from "@/components/issp-editor/part4/part4-year-form";

export default function Part4Year2Page() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part4YearForm
      year={doc.startYear + 1}
      yearKey="year2"
      initialData={doc.part4.year2}
      internalProjects={doc.part3.internalProjects.map((p) => ({ id: p.id, title: p.title }))}
      crossAgencyProjects={doc.part3.crossAgencyProjects.map((p) => ({ id: p.id, title: p.title }))}
    />
  );
}
