import type { IsspDocument } from "@/lib/store";
import { PlanStatusPill } from "@/components/ui/plan-status-pill";

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlanMetadataStrip({ doc }: { doc: IsspDocument }) {
  const period = `${doc.startYear}–${doc.endYear}`;
  const planStatus = doc.planStatus ?? "draft";
  const deadline = doc.submissionTarget?.deadline ?? null;

  return (
    <div className="flex items-center justify-end gap-3 flex-wrap text-xs">
      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
        {doc.agency.acronym || doc.agency.name}
      </span>
      <span className="text-muted-foreground">{period}</span>
      <PlanStatusPill status={planStatus} />
      {deadline && (
        <span className="text-muted-foreground">
          Due <time dateTime={deadline}>{formatDeadline(deadline)}</time>
        </span>
      )}
    </div>
  );
}
