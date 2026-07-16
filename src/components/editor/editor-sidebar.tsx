"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileOutput,
  FolderOpen,
  Loader2,
  Check,
  Settings2,
  MoreHorizontal,
  Palette,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { useFileSaveReminder } from "@/hooks/use-file-save-reminder";
import { PARTS, FRONT_MATTER_SECTIONS, ANNEX_SECTIONS, computeStatus, type SectionDef, type PartDef } from "@/lib/sections";
import { getChangedFields, type SectionField } from "@/lib/section-fields";
import { StatusDot } from "@/components/ui/status-dot";
import { IsspPropertiesDialog } from "./issp-properties-dialog";
import { THEMES, isThemeId, useTheme, type ThemeId } from "@/lib/theme";
import { toast } from "sonner";

type ExportState =
  | { status: "idle" }
  | { status: "exporting"; stage: string; pct: number }
  | { status: "done" }
  | { status: "error"; message: string };

/** Parse one raw SSE block (text between blank-line separators) into {event, data}. */
function parseSseEvent(raw: string): { event: string; data: string } | null {
  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trimStart();
  }
  return data ? { event, data } : null;
}

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

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function ThemeMenuItems({ onThemeSelected }: { onThemeSelected?: () => void }) {
  const { theme, setTheme } = useTheme();

  function handleThemeChange(value: string) {
    if (!isThemeId(value)) return;
    setTheme(value);
    onThemeSelected?.();
  }

  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
      {THEMES.map((item) => (
        <Fragment key={item.id}>
          {item.id === "warm-light" && <DropdownMenuSeparator />}
          <DropdownMenuRadioItem value={item.id} className="gap-2">
            <ThemePreview theme={item.id} />
            {item.name}
          </DropdownMenuRadioItem>
        </Fragment>
      ))}
    </DropdownMenuRadioGroup>
  );
}

function ThemePreview({ theme }: { theme: ThemeId }) {
  const item = THEMES.find((candidate) => candidate.id === theme)!;

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border"
      style={{ backgroundColor: item.background, borderColor: item.border }}
    >
      <span
        className="h-2 w-2 rounded-full border border-black/10"
        style={{ backgroundColor: item.secondary }}
      />
    </span>
  );
}

const sidebarControlClass =
  "!border-border !bg-card !text-foreground shadow-none hover:!bg-accent hover:!text-accent-foreground";

function SaveReminderCallout({
  compact = false,
  onSave,
  onSnooze,
}: {
  compact?: boolean;
  onSave: () => void;
  onSnooze: () => void;
}) {
  return (
    <div
      className={cn(
        "save-reminder-nudge rounded-lg border border-warning-border bg-warning-bg text-warning shadow-lg shadow-black/10",
        compact ? "px-3 py-2" : "px-3 py-2.5"
      )}
    >
      <div className="relative z-10 flex items-start gap-2">
        <Download className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold leading-tight">Save a backup file</p>
          <p className="text-[11px] leading-snug text-warning/80">
            You have unsaved changes from the last 10 minutes. Download a .issp file to avoid losing work if this browser data is cleared.
          </p>
          <button
            type="button"
            className="text-[11px] font-medium leading-none text-warning hover:underline"
            onClick={onSave}
          >
            Save changes
          </button>
        </div>
        <button
          type="button"
          aria-label="Snooze save reminder"
          className="-mr-1 -mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-warning hover:bg-warning-border/50"
          onClick={onSnooze}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function SaveReminderDialog({
  open,
  onSave,
  onSnooze,
}: {
  open: boolean;
  onSave: () => void;
  onSnooze: () => void;
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onSnooze(); }}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <div className="relative z-10 p-4">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-warning-bg text-warning ring-1 ring-warning-border">
              <Download className="h-5 w-5" />
            </div>
            <DialogTitle>Save a backup file</DialogTitle>
            <DialogDescription>
              You have unsaved changes from the last 10 minutes. Your work is saved in this browser, but a .issp file protects it if browser data is cleared or you switch devices.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="relative z-10 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4">
          <Button type="button" variant="outline" onClick={onSnooze} className={cn("w-full", sidebarControlClass)}>
            Dismiss
          </Button>
          <Button type="button" onClick={onSave} className="w-full bg-teal-600 text-white hover:bg-teal-700">
            <Download className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline PDF export progress ────────────────────────────────────────────────
// Replaces the sidebar's Save/Properties/kebab controls in place while an
// export is in flight — same footer-swap pattern as the clear-editor card.

function ExportProgressCard({ state, onDismiss }: { state: ExportState; onDismiss: () => void }) {
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2.5 text-destructive">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Export failed</p>
          <p className="text-xs leading-snug">{state.message}</p>
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className={cn("h-7 text-xs px-3", sidebarControlClass)} onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  const done = state.status === "done";
  const pct = state.status === "exporting" ? state.pct : 100;
  const stage = state.status === "exporting" ? state.stage : "Done";

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {done ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {done ? "PDF exported" : "Exporting PDF…"}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{stage}</span>
          <span className="tabular-nums ml-2 shrink-0">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Collapsed sidebar ────────────────────────────────────────────────────────

function CollapsedSidebar({ onToggle }: { onToggle: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex h-dvh w-12 flex-col items-center border-r border-border/50 bg-secondary py-4">
      <Button size="icon" variant="ghost" aria-label="Expand sidebar" onClick={onToggle} className="h-8 w-8 text-foreground hover:bg-accent">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Separator className="mt-2" />
      <div className="flex-1" />
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
  const { doc, saveToFile, loadFromFile, fileSavedAt, savedSnapshot, unsavedToFile, clearDoc, saveStatus, saveError } = useIsspStore();
  const now = useNow();
  const isMobileViewport = useIsMobileViewport();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [propsOpen, setPropsOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
  const [clearStep, setClearStep] = useState<"idle" | "step1" | "step2">("idle");
  const [showChanges, setShowChanges] = useState(false);
  const [themeNudgeDismissed, setThemeNudgeDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("issp-theme-nudge-dismissed") === "true"
  );
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);
  const { reminderDue: saveReminderDue, snoozeReminder: snoozeSaveReminder } = useFileSaveReminder(unsavedToFile);
  const showSaveReminder = unsavedToFile && saveReminderDue;
  const showMobileSaveReminder = showSaveReminder && isMobileViewport;
  const showDesktopSaveReminder = showSaveReminder && !isMobileViewport;
  const showThemeNudge = !!doc && theme === "system-light" && !themeNudgeDismissed && !showSaveReminder;

  // Sections with content that differs from the last saved file
  const changedSections: { section: SectionDef; part: PartDef | null; changedFields: SectionField[] }[] = [];
  if (doc && unsavedToFile) {
    const groups: { part: PartDef | null; sections: readonly SectionDef[] }[] = [
      { part: null, sections: FRONT_MATTER_SECTIONS },
      ...PARTS.map((part) => ({ part, sections: part.sections })),
    ];
    if (savedSnapshot) {
      for (const { part, sections } of groups) {
        for (const section of sections) {
          const fields = getChangedFields(section.id, doc, savedSnapshot);
          if (fields.length > 0) {
            changedSections.push({ section, part, changedFields: fields });
          }
        }
      }
    } else {
      const meta = doc.sectionMeta ?? {};
      for (const { part, sections } of groups) {
        for (const section of sections) {
          const editedAt = meta[section.id]?.lastEditedAt;
          const markedDone = meta[section.id]?.userMarkedDone ?? false;
          const contentChanged = editedAt && (!fileSavedAt || editedAt > fileSavedAt);
          const doneChanged = markedDone && !fileSavedAt;
          if (contentChanged || doneChanged) {
            const changedFields: SectionField[] = [];
            if (doneChanged) changedFields.push({ key: "markedDone", label: "Marked as done" });
            changedSections.push({ section, part, changedFields });
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
    const result = await clearDoc();
    if (result.success) {
      setClearStep("idle");
      toast.success("Browser draft cleared.");
    } else {
      toast.error(result.error);
    }
  }

  function dismissThemeNudge() {
    localStorage.setItem("issp-theme-nudge-dismissed", "true");
    setThemeNudgeDismissed(true);
  }

  function openThemeMenuFromNudge() {
    setFileMenuOpen(true);
  }

  function handleFileMenuOpenChange(open: boolean) {
    setFileMenuOpen(open);
    if (!open) setThemeSubmenuOpen(false);
  }

  async function handleSaveToFile() {
    const result = await saveToFile();
    if (result.success) {
      snoozeSaveReminder();
      setShowChanges(false);
      toast.success("ISSP file downloaded.");
    } else {
      toast.error(result.error);
    }
  }

  function handleSnoozeSaveReminder() {
    snoozeSaveReminder();
  }

  function handleNavigate() {
    setShowChanges(false);
    onMobileClose();
  }

  async function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await loadFromFile(file);
    if (result.success) {
      toast.success("ISSP file loaded.");
    } else {
      toast.error(result.error ?? "Could not load the ISSP file.");
    }
    e.target.value = "";
  }

  async function handleExportPdf() {
    if (!doc || exportState.status === "exporting") return;
    setExportState({ status: "exporting", stage: "Starting…", pct: 0 });
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) {
        // Surface a human-readable cause. nginx returns 413 (HTML page) when the
        // doc exceeds the body limit; 400 means the doc is missing required fields.
        let msg = `Export failed (HTTP ${res.status}).`;
        if (res.status === 413) msg = "This ISSP is too large to export — it exceeds the server's upload limit. Remove or compress embedded diagrams/logos, then try again.";
        else if (res.status === 400) msg = "The ISSP is missing required fields (agency, or coverage years). Fill those in the editor, then export.";
        throw new Error(msg);
      }
      if (!res.body) throw new Error("No response stream from server.");

      // Consume the Server-Sent Events stream: progress events update the bar;
      // the done event carries the PDF as base64; error events abort.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const evt = parseSseEvent(raw);
          if (!evt) continue;
          if (evt.event === "progress") {
            const p = JSON.parse(evt.data) as { stage: string; pct: number };
            setExportState({ status: "exporting", ...p });
          } else if (evt.event === "done") {
            const { filename, pdf } = JSON.parse(evt.data) as { filename: string; pdf: string };
            // Let the browser decode the base64 PDF via a data URI.
            const blob = await (await fetch(`data:application/pdf;base64,${pdf}`)).blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            setExportState({ status: "done" });
            toast.success("PDF exported.");
            // Hold the "Done" card briefly so the user sees it finish, then revert.
            setTimeout(() => setExportState({ status: "idle" }), 1000);
            return;
          } else if (evt.event === "error") {
            const { message } = JSON.parse(evt.data) as { message?: string };
            throw new Error(message ?? "PDF generation failed.");
          }
        }
      }
      // Stream closed without a "done" or "error" event.
      throw new Error("Export stream ended unexpectedly. Please try again.");
    } catch (err) {
      console.error("PDF export failed:", err);
      const message = err instanceof Error && err.message ? err.message : "PDF export failed. Please try again.";
      toast.error(message);
      setExportState({ status: "error", message });
    }
  }

  if (!doc) return null;

  const sectionMeta = doc.sectionMeta ?? {};
  const pendingReviewIds = doc.migrationReview?.pendingSectionIds ?? [];

  // ── Shared nav (rendered in both mobile popup and desktop sidebar) ──────────
  const navContent = (
    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0">
      <Link
        href="/editor"
        onClick={handleNavigate}
        className={cn(
          "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
          pathname === "/editor"
            ? "bg-[var(--sidebar-active)] text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        Overview
      </Link>

      {FRONT_MATTER_SECTIONS.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(section.href + "/");
        const status = computeStatus(sectionMeta[section.id]);
        return (
          <Link
            key={section.id}
            href={section.href}
            onClick={handleNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-[var(--sidebar-active)] text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <StatusDot status={status} size={6} className="shrink-0" />
            <span className="truncate">{section.label}</span>
          </Link>
        );
      })}

      {PARTS.map((part) => {
        const hasPendingReview = (doc.migrationReview?.pendingSectionIds ?? []).some((id) => id.startsWith(`part${part.partNum}/`));
        const isExpanded = expandedParts.has(part.partNum) || hasPendingReview;
        const isActiveSection = part.sections.some(
          (s) => pathname === s.href || pathname.startsWith(s.href + "/")
        );

        return (
          <div key={part.partNum} className="mt-2">
            <button
              type="button"
              onClick={() => { if (!hasPendingReview) togglePart(part.partNum); }}
              aria-disabled={hasPendingReview}
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
                  const needsReview = pendingReviewIds.includes(section.id);
                  return (
                    <Link
                      key={section.id}
                      href={section.href}
                      onClick={handleNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md py-2 pl-4 pr-3 text-sm transition-colors",
                        isActive
                          ? "bg-[var(--sidebar-active)] text-foreground font-medium"
                          : needsReview
                            ? "border border-warning-border bg-warning-bg text-foreground hover:brightness-95"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {!section.readOnly && <StatusDot status={status} size={6} className="shrink-0" />}
                      <span className="truncate">{section.label}</span>
                      {needsReview && (
                        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] font-semibold text-warning">
                          <AlertTriangle className="h-3 w-3" /> Review
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Annexes */}
      <div className="mt-2">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Annexes
        </p>
        {ANNEX_SECTIONS.map((section) => {
          const isActive = pathname === section.href || pathname.startsWith(section.href + "/");
          const count = section.id === "annexes/annex1" ? (doc?.annexedOffices?.length ?? 0) : 0;
          return (
            <Link
              key={section.id}
              href={section.href}
              onClick={handleNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[var(--sidebar-active)] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="truncate flex-1">{section.label}</span>
              {count > 0 && (
                <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* ── Mobile: glass popup ───────────────────────────────────────────── */}

      {/* Backdrop — rendered only while open so it leaves nothing behind on close */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 animate-overlay-fade-in md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Glass panel */}
      <div
        className={cn(
          "fixed left-3 right-3 top-14 z-50 flex flex-col md:hidden",
          "max-h-[calc(100dvh-5rem)] overflow-hidden",
          "rounded-2xl border border-border",
          "bg-secondary",
          "shadow-2xl shadow-black/20",
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
              ISSP Builder
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
            className="h-7 w-7 shrink-0 text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        {navContent}

        <SaveReminderDialog open={showMobileSaveReminder} onSave={handleSaveToFile} onSnooze={handleSnoozeSaveReminder} />

        {/* Compact footer */}
        <div className="border-t border-border/50 px-3 py-2.5 shrink-0">
          {clearStep === "step1" && (
            <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Clear editor data?</p>
                <p className="text-xs leading-snug text-muted-foreground">
                  This will permanently remove your ISSP from this browser.
                </p>
              </div>
              {unsavedToFile && (
                <div className="rounded-md border border-warning-border bg-warning-bg px-2.5 py-2 text-xs text-warning space-y-2">
                  <p className="font-medium">You have unsaved changes.</p>
                  <p className="leading-snug">Save your file before clearing.</p>
                  <Button size="sm" variant="outline" className={cn("h-7 text-xs px-2", sidebarControlClass)} onClick={handleSaveToFile}>
                    <Download className="h-3.5 w-3.5" />
                    Save .issp file
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 flex-1 text-xs px-3" onClick={() => setClearStep("step2")}>
                  Continue
                </Button>
                <Button size="sm" variant="outline" className={cn("h-7 flex-1 text-xs px-3", sidebarControlClass)} onClick={() => setClearStep("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {clearStep === "step2" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2.5 text-destructive">
              <div className="space-y-1">
                <p className="text-sm font-semibold">This action is irreversible.</p>
                <p className="text-xs leading-snug">
                  Your ISSP will be permanently deleted from this browser. There is no undo.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs px-3" onClick={handleClear}>
                  Delete permanently
                </Button>
                <Button size="sm" variant="outline" className={cn("h-7 flex-1 text-xs px-3", sidebarControlClass)} onClick={() => setClearStep("step1")}>
                  Go back
                </Button>
              </div>
            </div>
          )}

          {clearStep === "idle" && exportState.status !== "idle" && (
            <ExportProgressCard state={exportState} onDismiss={() => setExportState({ status: "idle" })} />
          )}

          {clearStep === "idle" && exportState.status === "idle" && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 text-xs">
                {saveStatus === "error" ? (
                  <span className="flex items-center gap-1.5 text-destructive font-medium truncate" title={saveError ?? undefined}>
                    <X className="h-3 w-3 shrink-0" />
                    Browser save failed
                  </span>
                ) : unsavedToFile ? (
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium truncate">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    Unsaved changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-success truncate">
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
                  sidebarControlClass,
                  unsavedToFile && "bg-teal-600 text-white border-teal-600 hover:bg-teal-700",
                  showMobileSaveReminder && "save-reminder-target"
                )}
                onClick={handleSaveToFile}
              >
                <Download className="h-3 w-3" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-7 gap-1.5 px-2.5 text-xs shrink-0", sidebarControlClass)}
                onClick={handleExportPdf}
              >
                <FileOutput className="h-3 w-3" />
                PDF
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  aria-label="More file actions"
                  className={cn(
                    "inline-flex h-7 w-7 coarse:h-10 coarse:w-10 shrink-0 items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sidebarControlClass
                  )}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-52">
                  <DropdownMenuItem onClick={handleSaveToFile}>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download .issp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FolderOpen className="h-3.5 w-3.5 mr-2" />
                    Load different ISSP…
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="h-3.5 w-3.5 mr-2" />
                      Theme
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent side="top" align="end" className="w-44">
                      <ThemeMenuItems />
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setClearStep("step1")}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Clear editor data…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: collapsed rail ───────────────────────────────────────── */}
      {collapsed && (
        <div className="hidden md:block">
          <CollapsedSidebar onToggle={onToggle} />
        </div>
      )}

      {/* ── Desktop: full sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:h-dvh md:w-72 md:flex-col md:overflow-hidden",
          "border-r border-border/50 bg-secondary",
          collapsed && "md:hidden"
        )}
      >
        {/* Header */}
        <div className="border-b">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              ISSP Builder
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">
                {doc.agency.acronym || doc.agency.name} · {doc.startYear}–{doc.endYear}
                {doc.amendmentNumber > 0 && ` · A${doc.amendmentNumber}`}
              </span>
              <Button size="icon" variant="ghost" aria-label="Collapse sidebar" onClick={onToggle} className="h-6 w-6 -mr-0.5 text-foreground hover:bg-accent">
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
            {saveStatus === "error" ? (
              <span className="flex items-center gap-1.5 text-destructive" title={saveError ?? undefined}>
                <X className="h-3 w-3 shrink-0" />
                Browser save failed
              </span>
            ) : unsavedToFile ? (
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
                            {part && (
                              <span className="font-semibold shrink-0" style={{ color: part.color }}>
                                {part.part}
                              </span>
                            )}
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
              <span className="flex items-center gap-1.5 text-success">
                <Check className="h-3 w-3 shrink-0" />
                {fileSavedAt ? `Saved ${formatTimeAgo(fileSavedAt, now)}` : "Up to date"}
              </span>
            )}
          </div>

          {/* Clear editor flow */}
          {clearStep === "step1" && (
            <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Clear editor data?</p>
                <p className="text-xs leading-snug text-muted-foreground">
                  This will permanently remove your ISSP from this browser.
                </p>
              </div>
              {unsavedToFile && (
                <div className="rounded-md border border-warning-border bg-warning-bg px-2.5 py-2 text-xs text-warning space-y-2">
                  <p className="font-medium">You have unsaved changes.</p>
                  <p className="leading-snug">Save your file before clearing.</p>
                  <Button size="sm" variant="outline" className={cn("h-7 text-xs px-2", sidebarControlClass)} onClick={handleSaveToFile}>
                    <Download className="h-3.5 w-3.5" />
                    Save .issp file
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 flex-1 text-xs px-3" onClick={() => setClearStep("step2")}>
                  Continue
                </Button>
                <Button size="sm" variant="outline" className={cn("h-7 flex-1 text-xs px-3", sidebarControlClass)} onClick={() => setClearStep("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {clearStep === "step2" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2.5 text-destructive">
              <div className="space-y-1">
                <p className="text-sm font-semibold">This action is irreversible.</p>
                <p className="text-xs leading-snug">
                  Your ISSP will be permanently deleted from this browser. There is no undo.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs px-3" onClick={handleClear}>
                  Delete permanently
                </Button>
                <Button size="sm" variant="outline" className={cn("h-7 flex-1 text-xs px-3", sidebarControlClass)} onClick={() => setClearStep("step1")}>
                  Go back
                </Button>
              </div>
            </div>
          )}

          {clearStep === "idle" && exportState.status !== "idle" && (
            <ExportProgressCard state={exportState} onDismiss={() => setExportState({ status: "idle" })} />
          )}

          {clearStep === "idle" && exportState.status === "idle" && (
            <>
              {/* Primary save + kebab */}
              <div className="relative flex gap-1.5">
                {showDesktopSaveReminder && (
                  <div className="absolute bottom-full right-0 z-20 mb-3 w-64">
                    <SaveReminderCallout onSave={handleSaveToFile} onSnooze={snoozeSaveReminder} />
                    <span className="absolute -bottom-1.5 right-16 h-3 w-3 rotate-45 border-b border-r border-warning-border bg-warning-bg" />
                  </div>
                )}
                {showThemeNudge && (
                  <div className="absolute bottom-full right-0 z-20 mb-3 w-56 rounded-lg border border-info-border bg-info-bg px-3 py-2.5 text-info shadow-lg shadow-black/10">
                    <div className="flex items-start gap-2">
                      <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs font-semibold leading-tight">Try themes</p>
                        <p className="text-[11px] leading-snug text-info/80">
                          Warm and dark modes are in this menu.
                        </p>
                        <button
                          type="button"
                          className="text-[11px] font-medium leading-none text-info hover:underline"
                          onClick={openThemeMenuFromNudge}
                        >
                          Open menu
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Dismiss theme notice"
                        className="-mr-1 -mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-info hover:bg-info-border/50"
                        onClick={dismissThemeNudge}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="absolute -bottom-1.5 right-3.5 h-3 w-3 rotate-45 border-b border-r border-info-border bg-info-bg" />
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={!unsavedToFile}
                  className={cn(
                    "h-9 flex-1 justify-start gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50",
                    sidebarControlClass,
                    unsavedToFile && "bg-teal-600 hover:bg-teal-700 text-white border-teal-600",
                    showDesktopSaveReminder && "save-reminder-target"
                  )}
                  onClick={handleSaveToFile}
                >
                  <Download className="h-4 w-4" />
                  {unsavedToFile ? "Save changes" : "No changes to save"}
                </Button>
                <DropdownMenu open={fileMenuOpen} onOpenChange={handleFileMenuOpenChange}>
                  <DropdownMenuTrigger
                    aria-label="More file actions"
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sidebarControlClass
                    )}
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
                    <DropdownMenuSub open={themeSubmenuOpen} onOpenChange={setThemeSubmenuOpen}>
                      <DropdownMenuSubTrigger
                        className={cn(
                          showThemeNudge &&
                            fileMenuOpen &&
                            "animate-pulse bg-info-bg text-info ring-1 ring-info-border focus:bg-info-bg focus:text-info data-popup-open:bg-info-bg data-popup-open:text-info data-open:bg-info-bg data-open:text-info"
                        )}
                      >
                        <Palette className="h-3.5 w-3.5 mr-2" />
                        Theme
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        <ThemeMenuItems onThemeSelected={dismissThemeNudge} />
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setClearStep("step1")}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Clear editor data…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className={cn("justify-start gap-2 text-xs", sidebarControlClass)} onClick={() => setPropsOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Properties
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("justify-start gap-2 text-xs", sidebarControlClass)}
                  onClick={handleExportPdf}
                >
                  <FileOutput className="h-3.5 w-3.5" />
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
