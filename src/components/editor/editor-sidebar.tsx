"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileOutput,
  LogOut,
  Loader2,
  Check,
  Settings2,
} from "lucide-react";
import { useIsspStore } from "@/lib/store";
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

// ─── Nav tree (static — no docId in local-first) ─────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Part I: Agency Profile",
    items: [
      { label: "A. Mandate, Vision & Mission", href: "/editor/part1/a" },
      { label: "B. Organization Structure", href: "/editor/part1/b" },
      { label: "C. Stakeholder Analysis", href: "/editor/part1/c" },
    ],
  },
  {
    label: "Part II: Current ICT Assessment",
    items: [
      { label: "A. Strategic Concerns", href: "/editor/part2/a" },
      { label: "B. Network & Cybersecurity", href: "/editor/part2/b" },
      { label: "C. IS Inventory", href: "/editor/part2/c" },
      { label: "D. E-Government Programs", href: "/editor/part2/d" },
    ],
  },
  {
    label: "Part III: Proposed ICT Strategy",
    items: [
      { label: "A. Proposed Infrastructure", href: "/editor/part3/a" },
      { label: "B. Enterprise Architecture", href: "/editor/part3/b" },
      { label: "C. Proposed Human Capital", href: "/editor/part3/c" },
      { label: "D. Proposed IS", href: "/editor/part3/d" },
      { label: "E.1 Internal Projects", href: "/editor/part3/e1" },
      { label: "E.2 Cross-Agency Projects", href: "/editor/part3/e2" },
      { label: "F. Performance Framework", href: "/editor/part3/f" },
    ],
  },
  {
    label: "Part IV: Resource Requirements",
    items: [
      { label: "Year 1 Breakdown", href: "/editor/part4/year1" },
      { label: "Year 2 Breakdown", href: "/editor/part4/year2" },
      { label: "Year 3 Breakdown", href: "/editor/part4/year3" },
      { label: "Summary of Investments", href: "/editor/part4/summary" },
    ],
  },
];


// ─── Collapsed sidebar ────────────────────────────────────────────────────────

function CollapsedSidebar({ onToggle }: { onToggle: () => void }) {
  return (
    <aside className="flex h-full w-12 flex-col items-center border-r bg-card py-4">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Expand sidebar"
        onClick={onToggle}
        className="h-8 w-8"
      >
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
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { doc, saveToFile, fileSavedAt, unsavedToFile } = useIsspStore();
  const now = useNow();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(NAV_SECTIONS.map((s) => s.label))
  );
  const [propsOpen, setPropsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    if (!doc || exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
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

  if (collapsed) return <CollapsedSidebar onToggle={onToggle} />;
  if (!doc) return null;

  function toggleSection(label: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            ISSP Editor
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Collapse sidebar"
              onClick={onToggle}
              className="h-6 w-6 -mr-0.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm font-semibold leading-tight truncate">{doc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doc.startYear}–{doc.endYear} · {doc.agency.acronym || doc.agency.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Draft</Badge>
            {doc.amendmentNumber > 0 && (
              <Badge variant="outline" className="text-xs">
                Amend #{doc.amendmentNumber}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <Link
          href="/editor"
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/editor"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          Overview
        </Link>

        {NAV_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.label);
          const isActiveSection = section.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );

          return (
            <div key={section.label} className="mt-2">
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors text-left",
                  isActiveSection ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{section.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isExpanded ? "" : "-rotate-90"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block rounded-md py-2 pl-5 pr-3 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t space-y-2">
        {/* File save status row */}
        <div className="flex items-center justify-between text-[10px]">
          {unsavedToFile ? (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <span className="relative flex h-2 w-2 mx-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              File out of sync
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3 w-3 shrink-0" />
              File up to date
            </span>
          )}
          {fileSavedAt && (
            <span className="text-muted-foreground/50">
              {formatTimeAgo(fileSavedAt, now)}
            </span>
          )}
        </div>

        <Button
          variant={unsavedToFile ? "default" : "outline"}
          className="w-full justify-start gap-2 text-sm"
          onClick={saveToFile}
        >
          <Download className="h-4 w-4" />
          {unsavedToFile ? "Save changes to file" : "Download .issp file"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 text-xs"
            onClick={() => setPropsOpen(true)}
          >
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
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileOutput className="h-3.5 w-3.5" />
            )}
            Export PDF
          </Button>
        </div>

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
          className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Exit Editor
        </Link>
      </div>

      <IsspPropertiesDialog open={propsOpen} onClose={() => setPropsOpen(false)} />
    </aside>
  );
}
