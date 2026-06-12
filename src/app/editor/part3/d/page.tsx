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

  // Projects from both III-E lists — name which project links each system
  const linkingProjects = [
    ...doc.part3.internalProjects,
    ...doc.part3.crossAgencyProjects,
  ].map((p) => ({ id: p.id, title: p.title, linkedSystemIds: p.linkedSystemIds ?? [] }));

  return (
    <Part3DForm
      initialSystems={doc.part3.proposedSystems}
      linkingProjects={linkingProjects}
    />
  );
}
