"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3DForm } from "@/components/issp-editor/part3/part3-d-form";

export default function Part3DPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  // System ids referenced by any project's linkedSystemIds — drives the "Has project" badge
  const linkedSystemIds = [
    ...doc.part3.internalProjects,
    ...doc.part3.crossAgencyProjects,
  ].flatMap((p) => p.linkedSystemIds ?? []);

  return (
    <Part3DForm
      initialSystems={doc.part3.proposedSystems}
      linkedSystemIds={linkedSystemIds}
    />
  );
}
