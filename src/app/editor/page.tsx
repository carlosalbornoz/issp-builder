"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FilePlus2,
  FolderOpen,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import type { NewDocOptions } from "@/lib/store";
import {
  type IsspForm,
  IsspFormFields,
  BLANK_FORM,
  SCOPE_LABELS,
  AMENDMENT_LABELS,
} from "@/components/editor/issp-properties-dialog";

// ─── New ISSP dialog ──────────────────────────────────────────────────────────

function NewIsspDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createNew } = useIsspStore();
  const [form, setForm] = useState<IsspForm>(BLANK_FORM);

  const endYear = form.startYear + 2;
  const title = `${form.agencyAcronym || form.agencyName ? (form.agencyAcronym || form.agencyName) + " " : ""}Information Systems Strategic Plan ${form.startYear}–${endYear}`;

  function set<K extends keyof IsspForm>(key: K, value: IsspForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    if (!isValid) return;
    const opts: NewDocOptions = {
      title,
      startYear: form.startYear,
      endYear,
      amendmentNumber: form.amendmentNumber,
      scope: form.scope,
      agencyHeadName: form.agencyHeadName.trim(),
      agency: {
        name: form.agencyName.trim(),
        acronym: form.agencyAcronym.trim().toUpperCase(),
        type: form.agencyType,
        websiteUrl: form.agencyWebsite.trim(),
        logoBase64: null,
      },
    };
    createNew(opts);
    onClose();
  }

  const isValid =
    form.agencyName.trim().length > 0 &&
    form.agencyAcronym.trim().length > 0 &&
    form.agencyHeadName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ISSP</DialogTitle>
        </DialogHeader>

        <IsspFormFields form={form} set={set} endYear={endYear} idPrefix="new-" />

        {isValid && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground text-sm leading-snug">{title}</p>
            <p>
              {form.startYear}–{endYear} · {SCOPE_LABELS[form.scope]} ·{" "}
              {AMENDMENT_LABELS[form.amendmentNumber]}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid}>Create ISSP</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Splash view (no document loaded) ────────────────────────────────────────

function SplashView() {
  const { loadFromFile } = useIsspStore();
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

        {loadError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{loadError}</span>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Want to see a sample?{" "}
          <a
            href="/demo/ncwtr-issp-2026-2028.issp"
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

const PART_CARDS = [
  {
    part: "I",
    title: "Agency Profile & Strategic Context",
    color: "border-l-blue-500",
    items: [
      { label: "A. Mandate, Vision & Mission", href: "/editor/part1/a" },
      { label: "B. Organization Structure", href: "/editor/part1/b" },
      { label: "C. Stakeholder Analysis", href: "/editor/part1/c" },
    ],
  },
  {
    part: "II",
    title: "Current ICT Assessment",
    color: "border-l-amber-500",
    items: [
      { label: "A. Strategic Concerns", href: "/editor/part2/a" },
      { label: "B. Network & Cybersecurity", href: "/editor/part2/b" },
      { label: "C. IS Inventory", href: "/editor/part2/c" },
      { label: "D. E-Government Programs", href: "/editor/part2/d" },
    ],
  },
  {
    part: "III",
    title: "Proposed ICT Strategy",
    color: "border-l-green-500",
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
    part: "IV",
    title: "Resource Requirements",
    color: "border-l-purple-500",
    items: [
      { label: "Year 1 Breakdown", href: "/editor/part4/year1" },
      { label: "Year 2 Breakdown", href: "/editor/part4/year2" },
      { label: "Year 3 Breakdown", href: "/editor/part4/year3" },
      { label: "Summary of Investments", href: "/editor/part4/summary" },
    ],
  },
];

function OverviewView() {
  const { doc } = useIsspStore();

  if (!doc) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight leading-tight">{doc.title}</h1>

      {/* Part cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PART_CARDS.map((card) => (
          <div
            key={card.part}
            className={`rounded-xl border bg-card border-l-4 ${card.color} overflow-hidden`}
          >
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Part {card.part}
              </p>
              <p className="font-semibold text-sm mt-0.5">{card.title}</p>
            </div>
            <ul className="px-5 py-3 space-y-1">
              {card.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
