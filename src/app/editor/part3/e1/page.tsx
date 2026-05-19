"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3E1Form } from "@/components/issp-editor/part3/part3-e1-form";

export default function Part3E1Page() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part3E1Form
      proposedSystems={doc.part3.proposedSystems}
      initialProjects={doc.part3.internalProjects}
    />
  );
}
