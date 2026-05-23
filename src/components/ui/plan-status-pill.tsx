import { cn } from "@/lib/utils";

type PlanStatus = "draft" | "for_review" | "submitted";

interface PlanStatusPillProps {
  status: PlanStatus;
  className?: string;
}

const CONFIG: Record<PlanStatus, { label: string; dot: string; pill: string }> = {
  draft:      { label: "Draft",       dot: "bg-amber-500",  pill: "bg-amber-100 text-amber-800" },
  for_review: { label: "For review",  dot: "bg-blue-500",   pill: "bg-blue-100 text-blue-700"   },
  submitted:  { label: "Submitted",   dot: "bg-green-600",  pill: "bg-green-100 text-green-700" },
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
