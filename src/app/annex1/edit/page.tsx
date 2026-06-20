import { Suspense } from "react";
import { Annex1EditContent } from "./content";

export default function Annex1EditPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <Annex1EditContent />
    </Suspense>
  );
}
