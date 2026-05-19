"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FilePlus2,
  FolderOpen,
  BookOpen,
  FileText,
  AlertTriangle,
  Loader2,
  Check,
  BarChart2,
  Database,
  LayoutGrid,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import { NewIsspDialog } from "@/components/editor/new-issp-dialog";

// ── Data (kept from original landing page) ────────────────────────────────────

const ROADMAP_FEATURES = [
  {
    icon: Database,
    title: "ISSP Repository",
    body: "A centralized, searchable archive of agency ISSPs — structured data instead of buried PDFs on transparency pages.",
  },
  {
    icon: BarChart2,
    title: "ICT Budget Dashboard",
    body: "Visualizing ISSP budget requests vs. actual DBM releases across agencies and years. Fiscal transparency for ICT.",
  },
] as const;

const PAIN_POINTS = [
  {
    icon: FolderOpen,
    title: "Buried in transparency portals",
    body: "ISSPs are uploaded as PDFs deep in agency websites — no standard structure, no searchability, often years out of date.",
  },
  {
    icon: LayoutGrid,
    title: "No common structure",
    body: "Each agency formats their ISSP differently. Comparing plans or validating compliance requires manual effort at scale.",
  },
  {
    icon: TrendingUp,
    title: "No aggregate view",
    body: "Budget requests, system inventories, and ICT priorities exist agency by agency — no way to see the full picture.",
  },
] as const;

const WHY_POINTS = [
  "Supports MITHI ICT harmonization requirements",
  "Aligns with the Ease of Doing Business Act transparency mandates",
  "Reduces compliance burden on CIOs and ICT focal persons",
  "Enables civil society and journalists to track ICT accountability",
  "Provides DBM and DICT with structured, comparable data",
] as const;

const MITHI_CHECKLIST = [
  "Parts I–IV structured per DICT 2026 ISSP template",
  "PDF export aligned to DICT uniformity rules (Palatino, A4 landscape, 1-inch margins)",
  "eGov Programs Checklist (Part II-D) built in",
  "Network infrastructure & cybersecurity assessment sections",
  "Performance Framework with KPI tracking (Part III-F)",
  "Budget breakdown aligned to UACS coding structure",
] as const;

// ── Browser chrome wrapper ────────────────────────────────────────────────────

function BrowserMockup() {
  return (
    <div className="rounded-t-xl border border-b-0 border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50 ring-1 ring-gray-200/40">
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 bg-white border border-gray-200 rounded px-2.5 py-0.5 text-[11px] text-gray-400 font-mono truncate ml-1">
          app.issp.ph/editor/part2/c
        </div>
      </div>
      <Image
        src="/screenshots/issp-builder.png"
        alt="ISSP Builder — IS Inventory section showing structured agency ICT data"
        width={1400}
        height={900}
        className="w-full block"
        priority
      />
    </div>
  );
}

// ── NCWTR intro modal ─────────────────────────────────────────────────────────

function NcwtrIntroModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            Meet the agency in this sample ISSP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-0.5">
            <p className="font-semibold text-gray-900">
              National Commission on Waiting Time Reduction
            </p>
            <p className="text-xs text-gray-500">NCWTR · National Government Agency</p>
          </div>

          <p>
            The NCWTR is the government body mandated to make sure Filipinos spend less of
            their lives standing in line at government offices. Their official mission: to
            eliminate the distinctly Filipino experience of arriving at 7am, getting queue
            number 847, and being told to &ldquo;come back tomorrow.&rdquo;
          </p>

          <p>
            They have a flagship program called{" "}
            <span className="font-medium">LIPAD</span>{" "}
            <span className="text-gray-500 text-xs">
              (Leveraging ICT for Process and Attendance Delays)
            </span>
            , a real-time queue monitoring dashboard that has been in{" "}
            &ldquo;pilot testing&rdquo; since 2021. Progress is ongoing.
          </p>

          <p>
            The agency is headed by{" "}
            <span className="font-medium">Chairperson Maria Celeste R. Villanueva</span>,
            who once waited 4 hours at the LTO before deciding something needed to be done.
          </p>

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            All names, programs, and data in this sample are entirely fictitious and for
            demonstration purposes only. Any resemblance to actual government agencies,
            living or bureaucratic, is coincidental.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Maybe later
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#0038A8" }}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
            ) : (
              "Open Sample ISSP"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Content modal ─────────────────────────────────────────────────────────────

function ContentModal({
  open,
  onClose,
  title,
  html,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  html: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[82vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5">
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function HomePageClient({
  aboutHtml,
  privacyHtml,
}: {
  aboutHtml: string;
  privacyHtml: string;
}) {
  const router = useRouter();
  const { loadFromFile } = useIsspStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleIntroOpen, setSampleIntroOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(null);
    const result = await loadFromFile(file);
    if (result.success) {
      router.push("/editor");
    } else {
      setLoadError(result.error ?? "Unknown error");
    }
    e.target.value = "";
  }

  async function handleLoadSample() {
    setSampleLoading(true);
    setLoadError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${basePath}/demo/ncwtr-issp-2026-2028.issp`);
      if (!res.ok) throw new Error("Failed to fetch");
      const blob = await res.blob();
      const file = new File([blob], "ncwtr-issp-2026-2028.issp", { type: "application/json" });
      const result = await loadFromFile(file);
      if (result.success) {
        router.push("/editor");
      } else {
        setLoadError(result.error ?? "Unknown error");
      }
    } catch {
      setLoadError("Could not load sample file.");
    } finally {
      setSampleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm text-gray-900">ISSP Platform</span>
            <span className="text-[11px] text-gray-400 italic hidden sm:inline">
              (does not yet have an official name or acronym)
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#features"
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors hidden sm:block"
            >
              Features
            </a>
            <button
              onClick={() => setAboutOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              About
            </button>
            <button
              onClick={() => setPrivacyOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              Privacy
            </button>
          </nav>
        </div>
      </header>

      {/* ── Splash hero ── */}
      <section className="bg-gray-50/50 border-b border-gray-100 py-14">
        <div className="max-w-md mx-auto px-6">

          {/* Branding */}
          <div className="text-center space-y-1.5 mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-2">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ISSP Builder</h1>
            <p className="text-sm text-muted-foreground">
              Build your agency&apos;s 3-year Information Systems Strategic Plan
            </p>
            <p className="text-xs text-gray-400">
              For agency CIOs, ICT focal persons, and government transparency advocates.
            </p>
          </div>

          {/* Action cards */}
          <div className="grid gap-3">

            {/* Sample — primary CTA */}
            <button
              type="button"
              onClick={() => setSampleIntroOpen(true)}
              disabled={sampleLoading}
              className="group flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 text-left transition-colors hover:bg-primary/10 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                {sampleLoading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {sampleLoading ? "Loading…" : "Explore a sample ISSP"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A fully filled-out sample ISSP from a fictitious agency. Good place to start.
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400">or if you&apos;re ready</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => setNewDialogOpen(true)}
              className="group flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
                <FilePlus2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Start New ISSP</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Begin a blank ISSP for your agency. You&apos;ll provide agency details and coverage period.
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
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loadError}</span>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            Free to use · No account required · Local-first, works in your browser
          </p>
        </div>
      </section>

      {/* ── App preview / mockup ── */}
      <section className="bg-gray-50/30 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-0">
          <BrowserMockup />
        </div>
      </section>

      {/* ── Problem ── */}
      <section id="problem" className="py-14 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              The Problem
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Government ICT data is hard to find — and harder to use.
            </h2>
            <p className="text-sm text-gray-500 max-w-xl">
              Agencies are required to submit ISSPs. In practice, these documents are scattered,
              unstructured, or not published at all.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {PAIN_POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="border border-gray-200 rounded-lg p-5">
                  <div className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{p.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-14 bg-gray-50/60 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Platform Features
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Three tools. One mission.
            </h2>
            <p className="text-sm text-gray-500 max-w-xl">
              Built to close the gap between what DICT requires and what agencies can
              actually produce and share.
            </p>
          </div>

          {/* Live feature */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4 flex items-start gap-5">
            <div className="w-9 h-9 rounded-md border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">ISSP Creator / Editor</h3>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Now
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 max-w-2xl">
                A guided, part-by-part editor for agency ICT strategic plans — structured to the DICT 2026
                template across all four parts. Works entirely in your browser with no account required.
                Save progress as a .issp file, export to PDF when ready.
              </p>
              <button
                onClick={() => setNewDialogOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: "#0038A8" }}
              >
                Start building your ISSP <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Roadmap */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
            On the Roadmap
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {ROADMAP_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white/70 border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why It Matters ── */}
      <section id="why" className="py-14 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Why It Matters
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Grounded in law.<br />Built for accountability.
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                The MITHI framework requires agencies to align ICT investments with national priorities.
                ISSPs are the vehicle — but without public visibility, compliance becomes a paper exercise.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                This platform makes ISSP compliance visible: to agencies, to oversight bodies like DICT
                and DBM, and to the public whose taxes fund these systems.
              </p>
              <div className="space-y-2.5">
                {WHY_POINTS.map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#0038A8" }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs text-gray-600 leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  DICT / MITHI Requirements Covered
                </p>
              </div>
              <ul className="p-5 space-y-3">
                {MITHI_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#0038A8" }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs text-gray-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Requirements coverage is based on this tool&apos;s interpretation of materials available at{" "}
                  <a
                    href="https://dict.gov.ph/issp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-gray-600 transition-colors"
                  >
                    dict.gov.ph/issp
                  </a>
                  , including the agency manual posted there. We hope DICT can review this tool and provide feedback to help us improve its accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 bg-gray-950">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Get Started
          </p>
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to build your agency&apos;s ISSP?
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-7 leading-relaxed">
            Free to use. No account required. No procurement committee. Built on the official DICT 2026 template.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
            <button
              onClick={() => setNewDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#0038A8" }}
            >
              Start Building <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLoadSample}
              disabled={sampleLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {sampleLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                "Open Sample ISSP"
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Want to contribute?{" "}
            This is a volunteer-led, open-source initiative.{" "}
            <a href="mailto:issp-builder@carlosanton.io" className="text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors">
              Get in touch.
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: "#0038A8" }}
            >
              PH
            </div>
            <span className="text-xs text-gray-500">ISSP Platform — Open source. Built by Carlos Antonio Albornoz (and his AI Agents).</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <a href="#features" className="hover:text-gray-700 transition-colors">Features</a>
            <span className="text-gray-200" aria-hidden>·</span>
            <button onClick={() => setAboutOpen(true)} className="hover:text-gray-700 transition-colors">About</button>
            <span className="text-gray-200" aria-hidden>·</span>
            <button onClick={() => setPrivacyOpen(true)} className="hover:text-gray-700 transition-colors">Privacy</button>
          </div>
        </div>
      </footer>

      {/* ── Dialogs ── */}
      <NcwtrIntroModal
        open={sampleIntroOpen}
        onClose={() => setSampleIntroOpen(false)}
        onConfirm={() => { setSampleIntroOpen(false); handleLoadSample(); }}
        loading={sampleLoading}
      />

      <NewIsspDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreated={() => router.push("/editor")}
      />

      <ContentModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About this project"
        html={aboutHtml}
      />

      <ContentModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy & architecture"
        html={privacyHtml}
      />
    </div>
  );
}
