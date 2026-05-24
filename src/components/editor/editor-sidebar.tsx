"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileOutput,
  FolderOpen,
  LogOut,
  Loader2,
  Check,
  Settings2,
  RotateCcw,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { PARTS, computeStatus, type SectionDef, type PartDef } from "@/lib/sections";
import { getChangedFields, type SectionField } from "@/lib/section-fields";
import { StatusDot } from "@/components/ui/status-dot";
import { IsspPropertiesDialog } from "./issp-properties-dialog";

function formatTimeAgo(isoString: string, now: number): string {
  const diff = now - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Collapsed sidebar ────────────────────────────────────────────────────────

function CollapsedSidebar({ onToggle }: { onToggle: () => void }) {
  return (
    <aside className="flex h-full w-12 flex-col items-center border-r bg-secondary py-4">
      <Button size="icon" variant="ghost" aria-label="Expand sidebar" onClick={onToggle} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Separator className="mt-2" />
      <div className="flex-1" />
      <Link
        href="/"
        aria-label="Exit editor"
        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </Link>
    </aside>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function EditorSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}) {
  const { doc, saveToFile, loadFromFile, fileSavedAt, savedSnapshot, unsavedToFile, clearDoc } = useIsspStore();
  const now = useNow();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [propsOpen, setPropsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  // Sections with content that differs from the last saved file
  const changedSections: { section: SectionDef; part: PartDef; changedFields: SectionField[] }[] = [];
  if (doc && unsavedToFile) {
    if (savedSnapshot) {
      for (const part of PARTS) {
        for (const section of part.sections) {
          const fields = getChangedFields(section.id, doc, savedSnapshot);
          if (fields.length > 0) {
            changedSections.push({ section, part, changedFields: fields });
          }
        }
      }
    } else {
      const meta = doc.sectionMeta ?? {};
      for (const part of PARTS) {
        for (const section of part.sections) {
          const editedAt = meta[section.id]?.lastEditedAt;
          if (!editedAt) continue;
          if (!fileSavedAt || editedAt > fileSavedAt) {
            changedSections.push({ section, part, changedFields: [] });
          }
        }
      }
    }
  }

  function togglePart(partNum: number) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partNum)) next.delete(partNum);
      else next.add(partNum);
      return next;
    });
  }

  async function handleClear() {
    await clearDoc();
    setConfirmClear(false);
  }

  function handleSaveToFile() {
    saveToFile();
    setShowChanges(false);
  }

  function handleNavigate() {
    setShowChanges(false);
    onMobileClose();
  }

  async function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFromFile(file);
    e.target.value = "";
  }

  async function handleExportPdf() {
    if (!doc || exporting) return;
    setExporting(true);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.agency.acronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  if (!doc) return null;

  const sectionMeta = doc.sectionMeta ?? {};

  // ── Shared nav (rendered in both mobile popup and desktop sidebar) ──────────
  const navContent = (
    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0">
      <Link
        href="/editor"
        onClick={handleNavigate}
        className={cn(
          "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
          pathname === "/editor"
            ? "bg-[#D4D2C9] text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        Overview
      </Link>

      {PARTS.map((part) => {
        const isExpanded = expandedParts.has(part.partNum);
        const isActiveSection = part.sections.some(
          (s) => pathname === s.href || pathname.startsWith(s.href + "/")
        );

        return (
          <div key={part.partNum} className="mt-2">
            <button
              type="button"
              onClick={() => togglePart(part.partNum)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors text-left",
                isActiveSection ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Part {part.part}: {part.title}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform shrink-0 ml-1", isExpanded ? "" : "-rotate-90")} />
            </button>

            {isExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {part.sections.map((section) => {
                  const isActive = pathname === section.href || pathname.startsWith(section.href + "/");
                  const status = computeStatus(sectionMeta[section.id]);
                  return (
                    <Link
                      key={section.id}
                      href={section.href}
                      onClick={handleNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md py-2 pl-4 pr-3 text-sm transition-colors",
                        isActive
                          ? "bg-[#D4D2C9] text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {!section.readOnly && <StatusDot status={status} size={6} className="shrink-0" />}
                      <span className="truncate">{section.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Mobile: glass popup ───────────────────────────────────────────── */}

      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
      />

      {/* Glass panel */}
      <div
        className={cn(
          "fixed left-3 right-3 top-14 z-50 flex flex-col md:hidden",
          "max-h-[calc(100dvh-5rem)] overflow-hidden",
          "rounded-2xl border border-border/60",
          "bg-background/90 backdrop-blur-xl",
          "shadow-2xl shadow-black/10",
          "transition-[opacity,transform] duration-200 ease-out origin-top-left",
          mobileOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-[0.97] pointer-events-none"
        )}
      >
        {/* Popup header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              ISSP Editor
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doc.agency.acronym || doc.agency.name} · {doc.startYear}–{doc.endYear}
              {doc.amendmentNumber > 0 && ` · A${doc.amendmentNumber}`}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close navigation"
            onClick={onMobileClose}
            className="h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        {navContent}

        {/* Compact footer */}
        <div className="flex items-center gap-2 border-t border-border/50 px-3 py-2.5 shrink-0">
          <div className="flex-1 min-w-0 text-xs">
            {unsavedToFile ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-700 truncate">
                <Check className="h-3 w-3 shrink-0" />
                {fileSavedAt ? `Saved ${formatTimeAgo(fileSavedAt, now)}` : "Up to date"}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2.5 text-xs shrink-0",
              unsavedToFile && "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
            )}
            onClick={handleSaveToFile}
          >
            <Download className="h-3 w-3" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs shrink-0"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileOutput className="h-3 w-3" />}
            PDF
          </Button>
        </div>
      </div>

      {/* ── Desktop: collapsed rail ───────────────────────────────────────── */}
      {collapsed && (
        <div className="hidden h-full md:block">
          <CollapsedSidebar onToggle={onToggle} />
        </div>
      )}

      {/* ── Desktop: full sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex h-full w-72 flex-col overflow-hidden border-r bg-secondary",
          collapsed && "md:hidden"
        )}
      >
        {/* Header */}
        <div className="border-b">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              ISSP Editor
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">
                {doc.agency.acronym || doc.agency.name} · {doc.startYear}–{doc.endYear}
                {doc.amendmentNumber > 0 && ` · A${doc.amendmentNumber}`}
              </span>
              <Button size="icon" variant="ghost" aria-label="Collapse sidebar" onClick={onToggle} className="h-6 w-6 -mr-0.5">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Nav */}
        {navContent}

        {/* Full footer */}
        <div className="px-3 py-3 border-t space-y-2">
          {/* Save status */}
          <div className="text-xs">
            {unsavedToFile ? (
              <div>
                <button
                  onClick={() => setShowChanges((v) => !v)}
                  className="flex w-full items-center justify-between text-amber-600 font-medium hover:text-amber-700 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    Unsaved changes
                  </span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showChanges ? "" : "-rotate-90")} />
                </button>

                {showChanges && (
                  <div className="mt-2 space-y-1">
                    {changedSections.length === 0 ? (
                      <p className="text-muted-foreground px-1">No specific sections tracked.</p>
                    ) : (
                      changedSections.map(({ section, part, changedFields }) => (
                        <div key={section.id}>
                          <Link
                            href={section.href}
                            onClick={handleNavigate}
                            className="flex items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate"
                          >
                            <span className="font-semibold shrink-0" style={{ color: part.color }}>
                              {part.part}
                            </span>
                            <span className="truncate">{section.label}</span>
                          </Link>
                          {changedFields.length > 0 && (
                            <div className="pl-4 space-y-0.5 mt-0.5">
                              {changedFields.map((f) => (
                                <p key={f.key} className="text-[11px] text-muted-foreground/70 px-1 truncate">
                                  {f.label}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-green-700">
                <Check className="h-3 w-3 shrink-0" />
                {fileSavedAt ? `Saved ${formatTimeAgo(fileSavedAt, now)}` : "Up to date"}
              </span>
            )}
          </div>

          {/* Confirm clear */}
          {confirmClear && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2">
              <p className="text-xs text-destructive leading-snug">
                This will clear the document from your browser. Save your file first.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="h-7 text-xs px-3" onClick={handleClear}>
                  Clear
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!confirmClear && (
            <>
              {/* Primary save + kebab */}
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  className={`flex-1 justify-start gap-2 text-sm ${unsavedToFile ? "bg-teal-600 hover:bg-teal-700 text-white border-teal-600" : ""}`}
                  onClick={handleSaveToFile}
                >
                  <Download className="h-4 w-4" />
                  {unsavedToFile ? "Save changes" : "Download .issp"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="More file actions"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={handleSaveToFile}>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Download .issp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <FolderOpen className="h-3.5 w-3.5 mr-2" />
                      Load different ISSP…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => setConfirmClear(true)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      Start over…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start gap-2 text-xs" onClick={() => setPropsOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Properties
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 text-xs"
                  onClick={handleExportPdf}
                  disabled={exporting}
                >
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileOutput className="h-3.5 w-3.5" />}
                  Export PDF
                </Button>
              </div>
            </>
          )}

          <p className="text-[10px] text-muted-foreground/40 leading-relaxed select-none text-center">
            made with ❤️ <em>para sa bayan</em>
            {" · "}
            <a
              href="https://www.instagram.com/carlosanton.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground/70 transition-colors underline underline-offset-2"
            >
              @carlosanton.io
            </a>
          </p>
          <Link
            href="/"
            onClick={handleNavigate}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Exit Editor
          </Link>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".issp,application/json"
          className="hidden"
          onChange={handleLoadFile}
        />

        <IsspPropertiesDialog open={propsOpen} onClose={() => setPropsOpen(false)} />
      </aside>
    </>
  );
}
