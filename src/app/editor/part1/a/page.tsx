"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part1AForm } from "@/components/issp-editor/part1/part1-a-form";

export default function Part1APage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part1AForm
      agencyType={doc.agency.type}
      initialData={doc.part1}
    />
  );
}
