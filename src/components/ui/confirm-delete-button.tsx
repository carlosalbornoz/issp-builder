"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Two-tap destructive button: first tap arms ("Confirm?" for 3 s), second tap fires.
 * Drop-in replacement for instant trash-icon buttons on high-value objects.
 */
export function ConfirmDeleteButton({
  onDelete,
  ariaLabel,
  confirmText = "Confirm?",
  className,
  iconClassName = "h-3.5 w-3.5",
}: {
  onDelete: () => void;
  ariaLabel: string;
  /** Shown while armed — keep short; use it to hint at consequences (e.g. "Delete + KPIs?") */
  confirmText?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    onDelete();
  }

  return (
    <button
      type="button"
      aria-label={armed ? confirmText : ariaLabel}
      onClick={handleClick}
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-md transition-all",
        armed
          ? "h-7 px-2 gap-1 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/40"
          : "h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
        className
      )}
    >
      <Trash2 className={iconClassName} />
      {armed && <span className="whitespace-nowrap">{confirmText}</span>}
    </button>
  );
}
