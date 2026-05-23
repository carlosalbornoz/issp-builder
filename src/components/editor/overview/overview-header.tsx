import type { IsspDocument } from "@/lib/store";
import { CompletionBar } from "@/components/ui/completion-bar";

export function OverviewHeader({
  doc,
  doneCount,
  totalCount,
}: {
  doc: IsspDocument;
  doneCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <h1 className="font-display text-3xl font-medium tracking-tight leading-tight">
        {doc.title}
      </h1>
      <div className="shrink-0 w-52 pt-1.5">
        <CompletionBar numerator={doneCount} denominator={totalCount} showLabel />
      </div>
    </div>
  );
}
