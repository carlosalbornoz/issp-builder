"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part2CForm } from "@/components/issp-editor/part2/part2-c-form";

export default function Part2CPage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return <Part2CForm initialData={doc.part2.informationSystems} />;
}
