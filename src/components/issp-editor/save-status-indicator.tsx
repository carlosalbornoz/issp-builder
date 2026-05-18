import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const CONFIG = {
  saved:   { icon: Check,        label: "Local draft saved", color: "text-muted-foreground", spin: false },
  saving:  { icon: Loader2,      label: "Saving draft...",   color: "text-muted-foreground", spin: true  },
  unsaved: { icon: Clock,        label: "Unsaved changes",   color: "text-amber-600",        spin: false },
  error:   { icon: AlertCircle,  label: "Save failed",       color: "text-destructive",      spin: false },
};

export function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const { icon: Icon, label, color, spin } = CONFIG[status];
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", color)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", spin && "animate-spin")} />
      <span>{label}</span>
    </div>
  );
}

