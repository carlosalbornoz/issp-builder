"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part2AForm } from "@/components/issp-editor/part2/part2-a-form";

export default function Part2APage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part2AForm
      orgOutcomes={doc.part1.orgOutcomes}
      initialData={doc.part2.strategicConcerns}
    />
  );
}
