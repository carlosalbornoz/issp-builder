import { cn } from "@/lib/utils";
import type { SectionStatus } from "@/lib/store";

interface StatusDotProps {
  status: SectionStatus;
  size?: number;
  className?: string;
}

const COLOR: Record<SectionStatus, string> = {
  done:        "bg-success",
  in_progress: "bg-warning",
  empty:       "bg-muted-foreground/30",
};

export function StatusDot({ status, size = 7, className }: StatusDotProps) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full", COLOR[status], className)}
      style={{ width: size, height: size }}
      aria-label={status.replace("_", " ")}
    />
  );
}
