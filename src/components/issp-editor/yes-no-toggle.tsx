"use client";

import { cn } from "@/lib/utils";

export type YesNoAnswer = "yes" | "no" | "";

/**
 * Explicit Yes/No selector for template questions that demand a stated answer
 * (PIA "processes personal information" in II-C/III-D, EGP portal connection).
 * Clicking the selected answer clears it back to unset; unset shows a
 * "Not set" badge so unanswered never reads as "No".
 */
export function YesNoToggle({
  question,
  value,
  onChange,
}: {
  question: string;
  value: YesNoAnswer;
  onChange: (value: YesNoAnswer) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{question}</span>
      {(["yes", "no"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? "" : option)}
          className={cn(
            "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {option === "yes" ? "Yes" : "No"}
        </button>
      ))}
      {!value && (
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Not set</span>
      )}
    </div>
  );
}
