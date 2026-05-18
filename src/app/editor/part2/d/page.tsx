"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part2DForm } from "@/components/issp-editor/part2/part2-d-form";

export default function Part2DPage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part2DForm
      agencyType={doc.agency.type}
      initialData={doc.part2.egpChecklist}
    />
  );
}
