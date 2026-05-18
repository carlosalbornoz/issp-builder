"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FilePlus2,
  FolderOpen,
  Download,
  FileText,
  AlertTriangle,
  RotateCcw,
  FileOutput,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import type { AgencyType, IsspScope, NewDocOptions } from "@/lib/store";

// ─── Lookup tables ────────────────────────────────────────────────────────────

const AGENCY_TYPES: { value: AgencyType; label: string }[] = [
  { value: "NGA", label: "National Government Agency (NGA)" },
  { value: "GOCC", label: "Government-Owned or Controlled Corporation (GOCC)" },
  { value: "LGU", label: "Local Government Unit (LGU)" },
  { value: "OTHER", label: "Other Government Entity" },
];

const SCOPE_OPTIONS: { value: IsspScope; label: string }[] = [
  { value: "DEPARTMENT_WIDE", label: "Department-wide" },
  { value: "DEPARTMENT_CENTRAL_ONLY", label: "Department — Central Office Only" },
  { value: "CENTRAL_ONLY", label: "Central Office Only" },
  { value: "WITH_REGIONAL", label: "Central + Regional Offices" },
  { value: "WITH_BUREAUS", label: "Central + Bureaus" },
  { value: "AGENCY_WIDE", label: "Agency-wide" },
  { value: "AGENCY_CENTRAL_ONLY", label: "Agency — Central Office Only" },
  { value: "AGENCY_WITH_REGIONAL", label: "Agency with Regional Offices" },
  { value: "OTHER_GOVERNMENT_ENTITY", label: "Other Government Entity" },
  { value: "LGU_SCOPE", label: "Local Government Unit" },
];

const SCOPE_LABELS = Object.fromEntries(
  SCOPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<IsspScope, string>;

const AMENDMENT_LABELS: Record<number, string> = {
  0: "Regular ISSP",
  1: "Amendment 1",
  2: "Amendment 2",
  3: "Amendment 3",
};

// ─── New ISSP dialog ──────────────────────────────────────────────────────────

interface NewIsspForm {
  agencyName: string;
  agencyAcronym: string;
  agencyType: AgencyType;
  agencyWebsite: string;
  agencyHeadName: string;
  startYear: number;
  scope: IsspScope;
  amendmentNumber: number;
}

const CURRENT_YEAR = new Date().getFullYear();

const BLANK_FORM: NewIsspForm = {
  agencyName: "",
  agencyAcronym: "",
  agencyType: "NGA",
  agencyWebsite: "",
  agencyHeadName: "",
  startYear: CURRENT_YEAR,
  scope: "AGENCY_WIDE",
  amendmentNumber: 0,
};

function NewIsspDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createNew } = useIsspStore();
  const [form, setForm] = useState<NewIsspForm>(BLANK_FORM);

  const endYear = form.startYear + 2;
  const title = `${form.agencyAcronym || form.agencyName ? (form.agencyAcronym || form.agencyName) + " " : ""}Information Systems Strategic Plan ${form.startYear}–${endYear}`;

  function set<K extends keyof NewIsspForm>(key: K, value: NewIsspForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    if (!form.agencyName.trim() || !form.agencyAcronym.trim()) return;
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

  const isValid = form.agencyName.trim().length > 0 && form.agencyAcronym.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ISSP</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Agency info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Agency
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="agencyName">Agency Name</Label>
                  <Input
                    id="agencyName"
                    placeholder="e.g., Department of Information and Communications Technology"
                    value={form.agencyName}
                    onChange={(e) => set("agencyName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agencyAcronym">Acronym</Label>
                  <Input
                    id="agencyAcronym"
                    placeholder="e.g., DICT"
                    className="w-28 uppercase"
                    value={form.agencyAcronym}
                    onChange={(e) => set("agencyAcronym", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agencyType">Agency Type</Label>
                <Select
                  items={AGENCY_TYPES}
                  value={form.agencyType}
                  onValueChange={(v: string | null) =>
                    v && set("agencyType", v as AgencyType)
                  }
                >
                  <SelectTrigger id="agencyType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENCY_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agencyWebsite">
                  Website URL{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="agencyWebsite"
                  type="url"
                  placeholder="e.g., https://dict.gov.ph"
                  value={form.agencyWebsite}
                  onChange={(e) => set("agencyWebsite", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agencyHeadName">
                  Agency Head Name{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="agencyHeadName"
                  placeholder="e.g., Secretary Juan dela Cruz"
                  value={form.agencyHeadName}
                  onChange={(e) => set("agencyHeadName", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ISSP period */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Coverage Period
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startYear">Start Year</Label>
                <Input
                  id="startYear"
                  type="number"
                  min={2020}
                  max={2040}
                  value={form.startYear}
                  onChange={(e) => set("startYear", parseInt(e.target.value) || CURRENT_YEAR)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Year</Label>
                <Input value={endYear} readOnly className="bg-muted cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Scope & amendment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Scope & Type
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="scope">ISSP Scope</Label>
                <Select
                  items={SCOPE_OPTIONS}
                  value={form.scope}
                  onValueChange={(v: string | null) =>
                    v && set("scope", v as IsspScope)
                  }
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amendment">Document Type</Label>
                <Select
                  items={[0, 1, 2, 3].map(n => ({ value: String(n), label: AMENDMENT_LABELS[n] }))}
                  value={String(form.amendmentNumber)}
                  onValueChange={(v: string | null) =>
                    v && set("amendmentNumber", parseInt(v))
                  }
                >
                  <SelectTrigger id="amendment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {AMENDMENT_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          {isValid && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-sm leading-snug">{title}</p>
              <p>
                {form.startYear}–{endYear} · {SCOPE_LABELS[form.scope]} ·{" "}
                {AMENDMENT_LABELS[form.amendmentNumber]}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid}>
            Create ISSP
          </Button>
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
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo mark */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ISSP Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build your agency&apos;s 3-year Information Systems Strategic Plan
          </p>
        </div>

        {/* Action cards */}
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

        {/* Load error */}
        {loadError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Demo link */}
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
  const { doc, update, saveToFile, clearDoc } = useIsspStore();
  const [confirmClear, setConfirmClear] = useState(false);
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

  if (!doc) return null;

  async function handleClear() {
    await clearDoc();
    setConfirmClear(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {doc.agency.acronym || doc.agency.name} · {doc.startYear}–{doc.endYear}
          </p>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{doc.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SCOPE_LABELS[doc.scope]} ·{" "}
            {doc.amendmentNumber === 0
              ? "Regular ISSP"
              : `Amendment #${doc.amendmentNumber}`}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Label htmlFor="agencyHeadName" className="text-xs text-muted-foreground shrink-0">Agency Head</Label>
            <Input
              id="agencyHeadName"
              className="h-7 text-sm w-72"
              placeholder="e.g. Secretary Juan dela Cruz"
              value={doc.agencyHeadName}
              onChange={(e) => update((prev) => ({ ...prev, agencyHeadName: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={saveToFile}>
            <Download className="h-4 w-4" />
            Save to File
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileOutput className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

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

      {/* Danger zone */}
      <div className="rounded-xl border border-dashed border-muted-foreground/20 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Document
        </p>
        {confirmClear ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-destructive">
              This will clear the document from your browser. Make sure you&apos;ve saved the file
              first.
            </p>
            <Button size="sm" variant="destructive" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2 hover:text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Start Over / Load Different ISSP
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { doc, loading } = useIsspStore();

  // EditorShell in layout shows a spinner while loading — nothing to render here
  if (loading) return null;

  if (!doc) return <SplashView />;
  return <OverviewView />;
}
