"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3FForm } from "@/components/issp-editor/part3/part3-f-form";

export default function Part3FPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const allProjects = [
    ...doc.part3.internalProjects.map((p) => ({
      id: p.id,
      title: p.title,
      projectCategory: "internal" as const,
    })),
    ...doc.part3.crossAgencyProjects.map((p) => ({
      id: p.id,
      title: p.title,
      projectCategory: "crossAgency" as const,
    })),
  ];

  return (
    <Part3FForm
      allProjects={allProjects}
      initialFramework={doc.part3.performanceFramework}
    />
  );
}
