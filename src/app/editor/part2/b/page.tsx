"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part2BForm } from "@/components/issp-editor/part2/part2-b-form";

export default function Part2BPage() {
  const { doc, loading } = useIsspStore();
  const router = useRouter();

  if (loading) return null;
  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part2BForm
      initialData={{
        networkDiagrams: doc.part2.networkDiagrams,
        networkDescription: doc.part2.networkDescription,
        cybersecurityControls: doc.part2.cybersecurityControls,
      }}
    />
  );
}
