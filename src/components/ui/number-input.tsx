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
  /**
   * Peso-amount mode: live comma grouping while typing, max 2 decimals,
   * "1,234,567.89" formatting on blur. Implies decimals allowed.
   */
  currency?: boolean;
  /** Render a bare <input> with no base Input styling — for dense table cells. */
  unstyled?: boolean;
}

/** Insert comma grouping into a plain "digits[.decimals]" string. */
function groupDigits(s: string): string {
  const [int, dec] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

/** Sanitize raw input to digits + one dot + max 2 decimals. */
function sanitizeCurrency(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  }
  return s;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Number field that keeps an editable draft string so the user can clear it and
 * retype freely (no snapping to min / no sticky leading "0"), clamps to
 * min/max on blur, and exposes the right mobile keyboard via inputMode.
 *
 * Use this instead of a raw `type="number"` input for any numeric field.
 * For peso amounts, pass `currency` — the field itself shows grouped digits
 * (no separate formatted echo needed).
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  integer = true,
  currency = false,
  unstyled,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const display = (n: number) => (currency ? formatCurrency(n) : String(n));

  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState(() => display(value));
  const [prevValue, setPrevValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caretRef = React.useRef<number | null>(null);

  // Re-sync the draft from the source value when not actively editing.
  // Render-phase update (no effect) avoids the cascading-render lint rule.
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    setDraft(display(value));
  }

  // Restore the caret after a grouped reformat moved characters around.
  React.useLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [draft]);

  const parse = (s: string) => {
    const plain = currency ? s.replace(/,/g, "") : s;
    return integer && !currency ? parseInt(plain, 10) : parseFloat(plain);
  };
  const clamp = (n: number) => {
    let r = n;
    if (min != null) r = Math.max(min, r);
    if (max != null) r = Math.min(max, r);
    return r;
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (currency) {
      // Reformat with grouping, keeping the caret after the same count of
      // significant (digit/dot) characters it followed in the raw string.
      const caret = e.target.selectionStart ?? raw.length;
      const significantBefore = raw.slice(0, caret).replace(/[^\d.]/g, "").length;
      const plain = sanitizeCurrency(raw);
      const formatted = groupDigits(plain);
      let pos = 0;
      for (let seen = 0; pos < formatted.length && seen < significantBefore; pos++) {
        if (/[\d.]/.test(formatted[pos])) seen++;
      }
      caretRef.current = pos;
      setDraft(formatted);
      if (plain.trim() === "") return;
      const n = parseFloat(plain);
      if (!Number.isNaN(n)) onValueChange(n);
      return;
    }
    setDraft(raw);
    if (raw.trim() === "") return; // allow empty while editing; reconcile on blur
    const n = parse(raw);
    if (!Number.isNaN(n)) onValueChange(n); // commit live; clamp deferred to blur
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false);
    const n = parse(draft);
    const committed = clamp(draft.trim() === "" || Number.isNaN(n) ? (min ?? 0) : n);
    setDraft(display(committed));
    setPrevValue(committed);
    onValueChange(committed);
    onBlur?.(e);
  }

  const fieldProps = {
    ref: inputRef,
    type: "text" as const,
    inputMode: integer && !currency ? ("numeric" as const) : ("decimal" as const),
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
