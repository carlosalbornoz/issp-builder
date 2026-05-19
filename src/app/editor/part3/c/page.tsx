"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3CForm } from "@/components/issp-editor/part3/part3-c-form";

export default function Part3CPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return <Part3CForm initialData={doc.part3.proposedHumanCapital} />;
}
