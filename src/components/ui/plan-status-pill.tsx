import { cn } from "@/lib/utils";

type PlanStatus = "draft" | "for_review" | "submitted";

interface PlanStatusPillProps {
  status: PlanStatus;
  className?: string;
}

const CONFIG: Record<PlanStatus, { label: string; dot: string; pill: string }> = {
  draft:      { label: "Draft",       dot: "bg-warning",  pill: "bg-warning-bg text-warning border border-warning-border"   },
  for_review: { label: "For review",  dot: "bg-info",     pill: "bg-info-bg text-info border border-info-border"            },
  submitted:  { label: "Submitted",   dot: "bg-success",  pill: "bg-success-bg text-success border border-success-border"   },
};

export function PlanStatusPill({ status, className }: PlanStatusPillProps) {
  const { label, dot, pill } = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
