"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { DefinitionsForm } from "@/components/issp-editor/definitions/definitions-form";

export default function DefinitionsPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return <DefinitionsForm initialData={doc.definitions} />;
}
