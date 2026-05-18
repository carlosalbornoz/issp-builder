"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3BForm } from "@/components/issp-editor/part3/part3-b-form";

export default function Part3BPage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return <Part3BForm initialDiagramDataUrl={doc.part3.enterpriseArchDataUrl} />;
}
