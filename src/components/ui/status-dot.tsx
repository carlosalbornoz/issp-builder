import { cn } from "@/lib/utils";
import type { SectionStatus } from "@/lib/store";

interface StatusDotProps {
  status: SectionStatus;
  size?: number;
  className?: string;
}

const COLOR: Record<SectionStatus, string> = {
  done:        "bg-green-700",
  in_progress: "bg-amber-600",
  empty:       "bg-zinc-300",
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
