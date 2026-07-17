"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isRichText, legacyToHtml, sanitizeRichText } from "@/lib/rich-text";

interface RichTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  toolbar?: boolean;
  className?: string;
}

function seedHtml(value: string): string {
  if (!value) return "";
  return isRichText(value) ? sanitizeRichText(value) : legacyToHtml(value);
}

function getLineStartText(root: HTMLElement): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const prev = node.previousSibling;
  if (prev !== null && !(prev instanceof HTMLBRElement)) return null;
  return (node.textContent ?? "").slice(0, range.startOffset);
}

function isInsideList(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.tagName === "LI") return true;
    node = node.parentNode;
  }
  return false;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  toolbar = false,
  className,
}: RichTextareaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !ref.current) return;
    ref.current.innerHTML = seedHtml(value);
    seeded.current = true;
    // Seeded once on mount only (uncontrolled contentEditable after that) —
    // re-syncing innerHTML from `value` on every render would fight the
    // caret position mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    onChange(sanitizeRichText(ref.current.innerHTML));
  }, [onChange]);

  const exec = useCallback(
    (command: "bold" | "italic" | "underline" | "insertUnorderedList") => {
      ref.current?.focus();
      document.execCommand(command);
      handleInput();
    },
    [handleInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const root = ref.current;
      if (!root) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        exec("bold");
        return;
      }
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        exec("italic");
        return;
      }
      if (mod && e.key.toLowerCase() === "u") {
        e.preventDefault();
        exec("underline");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (getLineStartText(root) === "") exec("insertUnorderedList");
        return;
      }
      if (e.key === " " && getLineStartText(root) === "-") {
        e.preventDefault();
        document.execCommand("delete");
        exec("insertUnorderedList");
        return;
      }
      if (e.key === "Enter" && !isInsideList(root)) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        handleInput();
      }
    },
    [exec, handleInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      const insertHtml = html ? sanitizeRichText(html) : legacyToHtml(text);
      document.execCommand("insertHTML", false, insertHtml);
      handleInput();
    },
    [handleInput]
  );

  return (
    <div className="space-y-1">
      {toolbar && (
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-1">
          <ToolbarButton label="Bold" onClick={() => exec("bold")}>
            <Bold className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => exec("italic")}>
            <Italic className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => exec("underline")}>
            <Underline className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <List className="h-3 w-3" />
          </ToolbarButton>
        </div>
      )}
      <div className="relative">
        {!value && placeholder && (
          <span className="pointer-events-none absolute left-2.5 top-2 text-base text-muted-foreground md:text-sm">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          id={id}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{ minHeight: `${rows * 1.5}rem` }}
          className={cn(
            "relative w-full rounded-lg border border-border bg-card px-2.5 py-2 text-base text-foreground transition-colors outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:pl-0.5",
            className
          )}
        />
      </div>
    </div>
  );
}
