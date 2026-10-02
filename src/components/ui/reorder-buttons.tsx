"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

/**
 * Move up / Move down pair for ordered lists (II-A concerns, III-D systems,
 * III-E projects, Part IV line items). Compact on desktop, 40px tap targets on
 * touch screens to match the row's other controls (usability principle 13).
 * Clicks never reach the row underneath (Part IV rows open the edit drawer).
 */
const CLS =
  "shrink-0 inline-flex h-7 w-7 coarse:h-10 coarse:w-10 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function ReorderButtons({
  label,
  isFirst,
  isLast,
  onMove,
}: {
  /** What moves, for the aria-labels: "concern #2" → "Move concern #2 up". */
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Move ${label} up`}
        title="Move up"
        className={CLS}
        disabled={isFirst}
        onClick={(e) => { e.stopPropagation(); onMove("up"); }}
      >
        <ArrowUp className="h-3.5 w-3.5 coarse:h-4 coarse:w-4" />
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        title="Move down"
        className={CLS}
        disabled={isLast}
        onClick={(e) => { e.stopPropagation(); onMove("down"); }}
      >
        <ArrowDown className="h-3.5 w-3.5 coarse:h-4 coarse:w-4" />
      </button>
    </>
  );
}
