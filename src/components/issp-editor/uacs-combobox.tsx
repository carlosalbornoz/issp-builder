"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check, X } from "lucide-react";

export interface UacsEntry {
  uacs: string;
  label: string;
  classification: string;
  sub_class: string;
  group: string;
  object_code: string;
  tags: string[];
}

type ContextFilter = "co" | "mooe" | "all";

interface UacsComboboxProps {
  value: string;
  onChange: (uacs: string, label: string) => void;
  context?: ContextFilter;
  placeholder?: string;
  className?: string;
}

// Singleton fetch — all instances share one in-flight request and resolve together
let _uacsData: UacsEntry[] | null = null;
let _uacsPromise: Promise<UacsEntry[]> | null = null;

function loadUacs(): Promise<UacsEntry[]> {
  if (_uacsData) return Promise.resolve(_uacsData);
  if (!_uacsPromise) {
    _uacsPromise = fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/uacs_active.min.json`)
      .then((r) => r.json())
      .then((data: UacsEntry[]) => { _uacsData = data; return data; });
  }
  return _uacsPromise;
}

function applyContext(codes: UacsEntry[], context: ContextFilter): UacsEntry[] {
  if (context === "co") return codes.filter((c) => c.uacs.startsWith("506"));
  if (context === "mooe")
    return codes.filter(
      (c) =>
        c.uacs.startsWith("502") ||
        c.uacs.startsWith("5021") ||
        c.uacs.startsWith("5029")
    );
  return codes;
}

interface DropdownPos { top: number; left: number; width: number }

export function UacsCombobox({
  value,
  onChange,
  context = "all",
  placeholder = "Search UACS code…",
  className,
}: UacsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allCodes, setAllCodes] = useState<UacsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 380 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch on open (with loading state shown in dropdown)
  useEffect(() => {
    if (open && allCodes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      loadUacs().then((data) => {
        setAllCodes(data);
        setLoading(false);
      });
    }
  }, [open, allCodes.length]);

  // Eager-fetch when a value is pre-filled (e.g. doc loaded from file) so
  // the label resolves without the user having to open the dropdown first
  useEffect(() => {
    if (value && allCodes.length === 0) {
      loadUacs().then(setAllCodes);
    }
  }, [value, allCodes.length]);

  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 420),
    });
  }, []);

  function openDropdown() {
    computePos();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => computePos();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, computePos]);

  // ICT chips — from real tagged data, filtered by context
  const ictChips = useMemo(
    () => applyContext(allCodes.filter((c) => c.tags.includes("ict")), context),
    [allCodes, context]
  );

  // Search results — ICT matches first, then everything else
  const { ictResults, otherResults } = useMemo(() => {
    if (!query.trim()) return { ictResults: [], otherResults: [] };

    const pool = applyContext(allCodes, context);
    const q = query.toLowerCase();

    const matches = pool.filter(
      (c) =>
        c.uacs.includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.sub_class.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.object_code.toLowerCase().includes(q)
    );

    return {
      ictResults: matches.filter((c) => c.tags.includes("ict")),
      otherResults: matches.filter((c) => !c.tags.includes("ict")),
    };
  }, [allCodes, query, context]);

  const totalResults = ictResults.length + otherResults.length;

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const found = allCodes.find((c) => c.uacs === value);
    return found ? `${found.uacs} — ${found.label}` : value;
  }, [value, allCodes]);

  function select(uacs: string, label: string) {
    onChange(uacs, label);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", "");
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="rounded-md border bg-popover shadow-lg"
    >
      {/* Search input */}
      <div className="p-2 border-b">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, or category…"
          className="w-full rounded-sm border-0 bg-muted/50 px-2 py-1.5 text-sm outline-none focus:bg-muted placeholder:text-muted-foreground"
        />
      </div>

      {loading && (
        <p className="px-3 py-4 text-sm text-muted-foreground text-center">Loading codes…</p>
      )}

      {!loading && (
        <div className="max-h-64 overflow-y-auto">
          {/* No query: show ICT chips */}
          {!query.trim() && (
            <>
              {ictChips.length > 0 && (
                <div className="p-2 border-b">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    ICT Codes ({ictChips.length})
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {ictChips.map((c) => (
                      <button
                        key={c.uacs}
                        type="button"
                        title={[c.classification, c.sub_class, c.group, c.label].filter(Boolean).join(" › ")}
                        onClick={() => select(c.uacs, c.label)}
                        className={cn(
                          "flex items-start gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                          value === c.uacs
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <span className="font-mono text-[11px] shrink-0 text-muted-foreground w-24 pt-0.5">
                          {c.uacs}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.label}</span>
                          <span className={cn(
                            "block truncate text-[10px]",
                            value === c.uacs ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {[c.sub_class, c.group].filter(Boolean).join(" › ")}
                          </span>
                        </span>
                        {value === c.uacs && <Check className="h-3 w-3 mt-0.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="px-3 py-2 text-[11px] text-muted-foreground text-center">
                Type to search all {allCodes.length.toLocaleString()} UACS codes
              </p>
            </>
          )}

          {/* Query: show results, ICT first */}
          {query.trim() && totalResults === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matching codes</p>
          )}

          {query.trim() && ictResults.length > 0 && (
            <>
              <div className="px-3 py-1 bg-muted/30 border-b">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-info">
                  ICT — {ictResults.length} match{ictResults.length !== 1 ? "es" : ""}
                </span>
              </div>
              {ictResults.map((c) => (
                <ResultRow key={c.uacs} entry={c} selected={value === c.uacs} onSelect={select} />
              ))}
            </>
          )}

          {query.trim() && otherResults.length > 0 && (
            <>
              {ictResults.length > 0 && (
                <div className="px-3 py-1 bg-muted/30 border-b border-t">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Other — {otherResults.length} match{otherResults.length !== 1 ? "es" : ""}
                  </span>
                </div>
              )}
              {otherResults.map((c) => (
                <ResultRow key={c.uacs} entry={c} selected={value === c.uacs} onSelect={select} />
              ))}
            </>
          )}

          {query.trim() && totalResults > 0 && (
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t text-right">
              {totalResults} result{totalResults !== 1 ? "s" : ""}
              {ictResults.length > 0 && ` · ${ictResults.length} ICT`}
            </p>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={cn(
          "flex w-full min-w-0 items-center justify-between rounded-md border bg-card px-3 py-2 text-sm text-foreground",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          open && "ring-1 ring-ring border-ring"
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? selectedLabel : placeholder}
        </span>
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {value && (
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" onClick={clear} />
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </button>

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}

function ResultRow({
  entry,
  selected,
  onSelect,
}: {
  entry: UacsEntry;
  selected: boolean;
  onSelect: (uacs: string, label: string) => void;
}) {
  const fullPath = [entry.classification, entry.sub_class, entry.group, entry.label]
    .filter(Boolean)
    .join(" › ");

  return (
    <button
      type="button"
      title={fullPath}
      onClick={() => onSelect(entry.uacs, entry.label)}
      className={cn(
        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
        selected && "bg-muted"
      )}
    >
      <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-primary", selected ? "opacity-100" : "opacity-0")} />
      <span className="min-w-0 flex-1">
        <span className="font-mono text-xs text-muted-foreground">{entry.uacs}</span>
        <span className="ml-2 text-foreground">{entry.label}</span>
        {(entry.sub_class || entry.group) && (
          <span className="block text-[11px] text-muted-foreground truncate">
            {[entry.sub_class, entry.group].filter(Boolean).join(" › ")}
          </span>
        )}
      </span>
    </button>
  );
}
