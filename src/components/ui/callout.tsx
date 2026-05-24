import { Info, Lightbulb, TriangleAlert, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: {
    icon: Info,
    cls: "bg-info-bg border-info-border text-info",
    iconCls: "text-info",
  },
  tip: {
    icon: Lightbulb,
    cls: "bg-success-bg border-success-border text-success",
    iconCls: "text-success",
  },
  warning: {
    icon: TriangleAlert,
    cls: "bg-warning-bg border-warning-border text-warning",
    iconCls: "text-warning",
  },
  danger: {
    icon: CircleAlert,
    cls: "bg-danger-bg border-danger-border text-destructive",
    iconCls: "text-destructive",
  },
} as const;

export type CalloutVariant = keyof typeof VARIANTS;

export function Callout({
  variant = "info",
  children,
  className,
}: {
  variant?: CalloutVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls, iconCls } = VARIANTS[variant];
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", cls, className)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconCls)} />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
