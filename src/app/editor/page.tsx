"use client";

import { useRef, useState } from "react";
import {
  FilePlus2,
  FolderOpen,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { NewIsspDialog } from "@/components/editor/new-issp-dialog";
import { PlanMetadataStrip } from "@/components/editor/overview/plan-metadata-strip";
import { OverviewHeader } from "@/components/editor/overview/overview-header";
import { ContinueEditingCard } from "@/components/editor/overview/continue-editing-card";
import { PartCard } from "@/components/editor/overview/part-card";
import Link from "next/link";
import { StatusDot } from "@/components/ui/status-dot";
import { PARTS, ALL_SECTIONS, FRONT_MATTER_SECTIONS, computeStatus } from "@/lib/sections";

// ─── Splash view (no document loaded) ────────────────────────────────────────

function SplashView() {
  const { loadFromFile, saveStatus, saveError } = useIsspStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(null);
    const result = await loadFromFile(file);
    if (!result.success) setLoadError(result.error ?? "Unknown error");
    e.target.value = "";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ISSP Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build your agency&apos;s 3-year Information Systems Strategic Plan
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <FilePlus2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Start New ISSP</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Begin a blank ISSP for your agency. You&apos;ll provide your agency details and
                coverage period.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Load from File</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Continue editing an ISSP you previously saved as a <code>.issp</code> file.
              </p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".issp,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {(loadError || (saveStatus === "error" && saveError)) && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{loadError ?? saveError}</span>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Want to see a sample?{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/demo/ncwtr-issp-2026-2028.issp`}
            download
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Download NCWTR demo file
          </a>
        </p>
      </div>

      <NewIsspDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── Overview view (document loaded) ─────────────────────────────────────────

function OverviewView() {
  const { doc } = useIsspStore();
  if (!doc) return null;

  const sectionMeta = doc.sectionMeta ?? {};
  const doneCount = ALL_SECTIONS.filter(
    (s) => computeStatus(sectionMeta[s.id]) === "done"
  ).length;

  return (
    <div className="space-y-6">
      <PlanMetadataStrip doc={doc} />
      <OverviewHeader doc={doc} doneCount={doneCount} totalCount={ALL_SECTIONS.length} />
      <ContinueEditingCard sectionMeta={sectionMeta} />
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="relative">
          <div className="absolute left-0 inset-y-0 w-[3px] bg-muted-foreground/40" />
          {FRONT_MATTER_SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="flex items-center gap-2.5 pl-5 pr-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <StatusDot status={computeStatus(sectionMeta[section.id])} size={6} className="shrink-0" />
              <span className="flex-1 truncate">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-2">Front Matter</span>
                {section.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PARTS.map((part) => (
          <PartCard key={part.partNum} part={part} sectionMeta={sectionMeta} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { doc, loading } = useIsspStore();

  if (loading) return null;

  if (!doc) return <SplashView />;
  return <OverviewView />;
}
