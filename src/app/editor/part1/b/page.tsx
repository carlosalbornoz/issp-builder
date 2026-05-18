"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part1BForm } from "@/components/issp-editor/part1/part1-b-form";

export default function Part1BPage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part1BForm
      initialData={{
        cioName: doc.part1.cioName,
        cioPosition: doc.part1.cioPosition,
        cioUnit: doc.part1.cioUnit,
        cioEmail: doc.part1.cioEmail,
        cioContact: doc.part1.cioContact,
        focalSameAsCio: doc.part1.focalSameAsCio,
        focalName: doc.part1.focalName,
        focalPosition: doc.part1.focalPosition,
        focalUnit: doc.part1.focalUnit,
        focalEmail: doc.part1.focalEmail,
        focalContact: doc.part1.focalContact,
        humanCapital: doc.part1.humanCapital,
      }}
    />
  );
}
