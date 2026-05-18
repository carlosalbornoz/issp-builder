"use client";

import { useRouter } from "next/navigation";
import { useIsspStore } from "@/lib/store";
import { Part3AForm } from "@/components/issp-editor/part3/part3-a-form";

export default function Part3APage() {
  const { doc } = useIsspStore();
  const router = useRouter();

  if (!doc) {
    router.replace("/editor");
    return null;
  }

  return (
    <Part3AForm
      initialData={{
        proposedNetworkDesc: doc.part3.proposedNetworkDesc,
        proposedCybersecControls: doc.part3.proposedCybersecControls as unknown as Record<string, Record<string, boolean>>,
        currentNetworkDesc: doc.part2.networkDescription,
        currentCybersecControls: doc.part2.cybersecurityControls as unknown as Record<string, Record<string, boolean>>,
      }}
    />
  );
}
