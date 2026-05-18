"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3DForm } from "@/components/issp-editor/part3/part3-d-form";

export default function Part3DPage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  const allProjectIds = [
    ...doc.part3.internalProjects.map((p) => p.id),
    ...doc.part3.crossAgencyProjects.map((p) => p.id),
  ];

  return (
    <Part3DForm
      initialSystems={doc.part3.proposedSystems}
      existingProjectIds={allProjectIds}
    />
  );
}
