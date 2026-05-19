"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part1CForm } from "@/components/issp-editor/part1/part1-c-form";

export default function Part1CPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return <Part1CForm initialData={doc.part1.stakeholders} />;
}
