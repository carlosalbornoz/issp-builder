"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  /** false allows decimals (inputMode "decimal"); default true (integers, inputMode "numeric"). */
  integer?: boolean;
  /** Render a bare <input> with no base Input styling — for dense table cells. */
  unstyled?: boolean;
}

/**
 * Number field that keeps an editable draft string so the user can clear it and
 * retype freely (no snapping to min / no sticky leading "0"), clamps to
 * min/max on blur, and exposes the right mobile keyboard via inputMode.
 *
 * Use this instead of a raw `type="number"` input for any numeric field.
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  integer = true,
  unstyled,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState(() => String(value));
  const [prevValue, setPrevValue] = React.useState(value);

  // Re-sync the draft from the source value when not actively editing.
  // Render-phase update (no effect) avoids the cascading-render lint rule.
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    setDraft(String(value));
  }

  const parse = (s: string) => (integer ? parseInt(s, 10) : parseFloat(s));
  const clamp = (n: number) => {
    let r = n;
    if (min != null) r = Math.max(min, r);
    if (max != null) r = Math.min(max, r);
    return r;
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDraft(raw);
    if (raw.trim() === "") return; // allow empty while editing; reconcile on blur
    const n = parse(raw);
    if (!Number.isNaN(n)) onValueChange(n); // commit live; clamp deferred to blur
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false);
    const n = parse(draft);
    const committed = clamp(draft.trim() === "" || Number.isNaN(n) ? (min ?? 0) : n);
    setDraft(String(committed));
    setPrevValue(committed);
    onValueChange(committed);
    onBlur?.(e);
  }

  const fieldProps = {
    type: "text" as const,
    inputMode: integer ? ("numeric" as const) : ("decimal" as const),
    value: draft,
    onChange: handleChange,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    },
    onBlur: handleBlur,
    ...props,
  };

  if (unstyled) return <input {...fieldProps} />;
  return <Input {...fieldProps} />;
}
