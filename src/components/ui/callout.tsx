import { Info, Lightbulb, TriangleAlert, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: {
    icon: Info,
    cls: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200",
    iconCls: "text-blue-500",
  },
  tip: {
    icon: Lightbulb,
    cls: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/40 dark:border-green-800 dark:text-green-200",
    iconCls: "text-green-500",
  },
  warning: {
    icon: TriangleAlert,
    cls: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200",
    iconCls: "text-amber-500",
  },
  danger: {
    icon: CircleAlert,
    cls: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200",
    iconCls: "text-red-500",
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
