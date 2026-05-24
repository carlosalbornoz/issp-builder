import { cn } from "@/lib/utils";

interface CompletionBarProps {
  numerator: number;
  denominator: number;
  showLabel?: boolean;
  className?: string;
}

export function CompletionBar({ numerator, denominator, showLabel, className }: CompletionBarProps) {
  const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <p className="text-xs text-muted-foreground">
          {pct}% complete · {numerator} of {denominator}
        </p>
      )}
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-success transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
