"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2, FolderOpen, BookOpen, FileText, AlertTriangle,
  Loader2, Check, BarChart2, Database, LayoutGrid, TrendingUp, ArrowRight,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import { NewIsspDialog } from "@/components/editor/new-issp-dialog";

// ── Data ──────────────────────────────────────────────────────────────────────

const ROADMAP_FEATURES = [
  { icon: Database, title: "ISSP Repository", body: "A centralized, searchable archive of agency ISSPs — structured data instead of buried PDFs on transparency pages." },
  { icon: BarChart2, title: "ICT Budget Dashboard", body: "Visualizing ISSP budget requests vs. actual DBM releases across agencies and years. Fiscal transparency for ICT." },
] as const;

const PAIN_POINTS = [
  { icon: FolderOpen, title: "Buried in transparency portals", body: "ISSPs are uploaded as PDFs deep in agency websites — no standard structure, no searchability, often years out of date." },
  { icon: LayoutGrid, title: "No common structure", body: "Each agency formats their ISSP differently. Comparing plans or validating compliance requires manual effort at scale." },
  { icon: TrendingUp, title: "No aggregate view", body: "Budget requests, system inventories, and ICT priorities exist agency by agency — no way to see the full picture." },
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

// Part colors from sections.ts
const PART_COLORS = ["#2563EB", "#D97706", "#16A34A", "#7C3AED"];

// ── NCWTR intro modal ─────────────────────────────────────────────────────────

function NcwtrIntroModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Meet the agency in this sample ISSP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div className="rounded-lg bg-secondary border px-4 py-3 space-y-0.5">
            <p className="font-semibold text-foreground">National Commission on Waiting Time Reduction</p>
            <p className="text-xs text-muted-foreground">NCWTR · National Government Agency</p>
          </div>
          <p>The NCWTR is the government body mandated to make sure Filipinos spend less of their lives standing in line at government offices. Their official mission: to eliminate the distinctly Filipino experience of arriving at 7am, getting queue number 847, and being told to &ldquo;come back tomorrow.&rdquo;</p>
          <p>They have a flagship program called <span className="font-medium text-foreground">LIPAD</span>{" "}<span className="text-xs">(Leveraging ICT for Process and Attendance Delays)</span>, a real-time queue monitoring dashboard that has been in &ldquo;pilot testing&rdquo; since 2021.</p>
          <p className="text-xs text-muted-foreground/70 border-t pt-3">All names, programs, and data in this sample are entirely fictitious and for demonstration purposes only.</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Maybe later</button>
          <button onClick={onConfirm} disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</> : "Open Sample ISSP"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentModal({ open, onClose, title, html }: { open: boolean; onClose: () => void; title: string; html: string; }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[82vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div ref={scrollRef} className="overflow-y-auto px-6 py-5">
          <div tabIndex={0} className="h-0 w-0 overflow-hidden outline-none" aria-hidden="true" />
          <div className="prose-disclaimer mb-5">The thoughts here are my own and reflect my personal experience and opinion only — they do not represent the views of any organization I am or have been affiliated with. AI helped me turn these thoughts into words.</div>
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePageClient({ aboutHtml, privacyHtml }: { aboutHtml: string; privacyHtml: string; }) {
  const router = useRouter();
  const { loadFromFile } = useIsspStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleIntroOpen, setSampleIntroOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  function openWhatsNew() {
    setWhatsNewOpen(true);
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: ["#2563EB", "#D97706", "#16A34A", "#7C3AED", "#fff"] });
    }, 120);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(null);
    const result = await loadFromFile(file);
    if (result.success) { router.push("/editor"); } else { setLoadError(result.error ?? "Unknown error"); }
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
      if (result.success) { router.push("/editor"); } else { setLoadError(result.error ?? "Unknown error"); }
    } catch { setLoadError("Could not load sample file."); }
    finally { setSampleLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Part-color accent strip */}
            <div className="flex gap-0.5 mr-1">
              {PART_COLORS.map((c) => (
                <span key={c} className="w-1.5 h-4 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <span className="font-display font-semibold text-sm tracking-tight">ISSP Builder</span>
            <span className="text-[11px] text-muted-foreground italic hidden sm:inline">(does not yet have an official name)</span>
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => setAboutOpen(true)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">About</button>
            <button onClick={() => setPrivacyOpen(true)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">Privacy</button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="min-h-[calc(100vh-3.5rem)] flex items-center border-b bg-secondary/40">
        <div className="w-full max-w-md mx-auto px-6 py-14">

          {/* Branding */}
          <div className="text-center space-y-2 mb-10">
            {/* Part-color accent strips */}
            <div className="flex justify-center gap-1 mb-4">
              {PART_COLORS.map((c) => (
                <span key={c} className="w-2 h-6 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">ISSP Builder</h1>
            <p className="text-sm text-muted-foreground">Build your agency&apos;s 3-year Information Systems Strategic Plan</p>
            <p className="text-xs text-muted-foreground/60">For agency CIOs, ICT focal persons, and government transparency advocates.</p>
          </div>

          {/* What's New pill */}
          <div className="flex justify-center mb-7">
            <div className="relative inline-flex">
              {/* static dim border ring */}
              <span
                className="absolute inset-[-1.5px] rounded-full opacity-40 pointer-events-none"
                style={{ background: "conic-gradient(#ff0080, #ff8c00, #ffe600, #00d4aa, #0070f3, #7928ca, #ff0080)" }}
              />
              {/* orbiting glow arc */}
              <span
                className="absolute inset-[-5px] rounded-full animate-glow-orbit blur-md opacity-80 pointer-events-none"
                style={{ background: "conic-gradient(from var(--glow-angle), transparent 0%, #7928ca 6%, #ff0080 10%, #ff8c00 14%, #ffe600 18%, transparent 24%, transparent 100%)" }}
              />
              {/* orbiting sharp arc (same angle, no blur) */}
              <span
                className="absolute inset-[-1.5px] rounded-full animate-glow-orbit pointer-events-none"
                style={{ background: "conic-gradient(from var(--glow-angle), transparent 0%, #7928ca 6%, #ff0080 10%, #ff8c00 14%, #ffe600 18%, transparent 24%, transparent 100%)" }}
              />
              <button
                onClick={openWhatsNew}
                className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                What&apos;s new — May 25, 2026
              </button>
            </div>
          </div>

          {/* Action cards */}
          <div className="grid gap-3">
            <button type="button" onClick={() => setSampleIntroOpen(true)} disabled={sampleLoading}
              className="group flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 text-left transition-all hover:bg-primary/10 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                {sampleLoading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <BookOpen className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{sampleLoading ? "Loading…" : "Explore a sample ISSP"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">A fully filled-out sample ISSP from a fictitious agency. Good place to start.</p>
              </div>
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">or if you&apos;re ready</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button type="button" onClick={() => setNewDialogOpen(true)}
              className="group flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-muted transition-colors">
                <FilePlus2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Start New ISSP</p>
                <p className="text-xs text-muted-foreground mt-0.5">Begin a blank ISSP for your agency. You&apos;ll provide agency details and coverage period.</p>
              </div>
            </button>

            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="group flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-muted transition-colors">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Load from File</p>
                <p className="text-xs text-muted-foreground mt-0.5">Continue editing an ISSP you previously saved as a <code className="text-xs bg-muted px-1 rounded">.issp</code> file.</p>
              </div>
            </button>

            <input ref={fileInputRef} type="file" accept=".issp,application/json" className="hidden" onChange={handleFileChange} />
          </div>

          {loadError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loadError}</span>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Free to use · No account required · Local-first, works in your browser
          </p>
        </div>
      </section>

      {/* ── Problem ── */}
      <section id="problem" className="py-16 border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">The Problem</p>
            <h2 className="font-display text-2xl font-bold mb-2">Government ICT data is hard to find — and harder to use.</h2>
            <p className="text-sm text-muted-foreground max-w-xl">Agencies are required to submit ISSPs. In practice, these documents are scattered, unstructured, or not published at all.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {PAIN_POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="border rounded-lg p-5 bg-card">
                  <div className="w-8 h-8 rounded-md border flex items-center justify-center mb-4 bg-secondary">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 border-b bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Platform Features</p>
            <h2 className="font-display text-2xl font-bold mb-2">Three tools. One mission.</h2>
          </div>

          <div className="bg-card border rounded-lg p-6 mb-4 flex items-start gap-5">
            <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary/5">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-sm font-semibold">ISSP Creator / Editor</h3>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">Live Now</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-2xl">A guided, part-by-part editor for agency ICT strategic plans — structured to the DICT 2026 template across all four parts. Works entirely in your browser with no account required. Save progress as a .issp file, export to PDF when ready.</p>
              <button onClick={() => setNewDialogOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity">
                Start building your ISSP <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">On the Roadmap</p>
          <div className="grid md:grid-cols-2 gap-4">
            {ROADMAP_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-card/60 border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-md border flex items-center justify-center bg-secondary">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-secondary text-muted-foreground border">Coming Soon</span>
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section id="why" className="py-16 border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Why It Matters</p>
              <h2 className="font-display text-2xl font-bold mb-4">Grounded in law.<br />Built for accountability.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">The MITHI framework requires agencies to align ICT investments with national priorities. ISSPs are the vehicle — but without public visibility, compliance becomes a paper exercise.</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">This platform makes ISSP compliance visible: to agencies, to oversight bodies like DICT and DBM, and to the public whose taxes fund these systems.</p>
              <div className="space-y-2.5">
                {WHY_POINTS.map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="px-5 py-4 border-b bg-secondary">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">DICT / MITHI Requirements Covered</p>
              </div>
              <ul className="p-5 space-y-3">
                {MITHI_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                    <span className="text-xs leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-4 border-t pt-4 bg-secondary/30">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Requirements coverage is based on this tool&apos;s interpretation of materials at{" "}
                  <a href="https://dict.gov.ph/issp" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">dict.gov.ph/issp</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16" style={{ background: "#1C1C1E" }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1.5 mb-6">
            {PART_COLORS.map((c) => (
              <span key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Get Started</p>
          <h2 className="font-display text-2xl font-bold text-white mb-3">Ready to build your agency&apos;s ISSP?</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-7 leading-relaxed">Free to use. No account required. No procurement committee. Built on the official DICT 2026 template.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
            <button onClick={() => setNewDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors">
              Start Building <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setSampleIntroOpen(true)} disabled={sampleLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50">
              {sampleLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</> : "Open Sample ISSP"}
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Want to contribute? This is a volunteer-led, open-source initiative.{" "}
            <a href="mailto:issp-builder@carlosanton.io" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">Get in touch.</a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-0.5">
              {PART_COLORS.map((c) => (
                <span key={c} className="w-1 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">ISSP Platform — Open source. Built by Carlos Antonio Albornoz (and his AI Agents).</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://github.com/carlosalbornoz/issp-builder" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">View on GitHub</a>
          </div>
        </div>
      </footer>

      {/* ── Dialogs ── */}
      <NcwtrIntroModal open={sampleIntroOpen} onClose={() => setSampleIntroOpen(false)}
        onConfirm={() => { setSampleIntroOpen(false); handleLoadSample(); }} loading={sampleLoading} />
      <NewIsspDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} onCreated={() => router.push("/editor")} />
      <ContentModal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this project" html={aboutHtml} />
      <ContentModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy & architecture" html={privacyHtml} />

      {/* What's New modal */}
      <Dialog open={whatsNewOpen} onOpenChange={setWhatsNewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[82vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What&apos;s new — May 25, 2026
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-muted-foreground leading-relaxed">

            {/* Fun blurb */}
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-center">
              <p className="text-sm font-medium italic text-foreground/75">
                Another weekend has passed, another commit was pushed. Here&apos;s what&apos;s changed:
              </p>
            </div>

            {/* 1 — DICT Caravan */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">DICT ISSP Caravan · May 25, 2026</p>
              <p className="text-amber-900/80 dark:text-amber-200/80">
                At the official DICT ISSP Caravan orientation — attended by ~212 agency officers — the DICT ISSP team gave this tool a nod. Yay at napansin rin nila tayo, ano? Haha. Moving forward, the ISSP Builder will strictly follow{" "}
                <span className="font-medium text-amber-900 dark:text-amber-200">MITHI Resolution 2026-02</span> — so to those asking: no, we will not let you create ISSPs here using the old template.{" "}
                No official endorsement, but DICT didn&apos;t tell anyone to stop using it either, so we&apos;ll take that as a win. 🏅
              </p>
            </div>

            {/* 2 — Coverage Period */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Coverage Period Locked</p>
              <p>
                All ISSPs must now cover <span className="text-foreground font-medium">FY 2028–2030</span> per MITHI Resolution 2026-02. The builder enforces this — the coverage period fields are no longer editable. No more accidentally submitting a 2027–2029 plan and finding out at the evaluation stage.
              </p>
            </div>

            {/* 3 — Themes */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Themes</p>
              <p>
                Four color themes are now available — <span className="text-foreground font-medium">System Light, System Dark, Warm Light, and Warm Dark</span>. Switch anytime from the editor header. Dark mode people: you&apos;re welcome. Warm mode people: also you.
              </p>
            </div>

            {/* 4 — Mobile Editing */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Mobile Editing</p>
              <p>
                You can now fill out your ISSP on your phone — including, hypothetically, during a meeting where someone is presenting the ISSP template. On mobile, the sidebar becomes a hamburger menu that opens a full-screen section selector. Nothing falls off the screen anymore.
              </p>
            </div>

            {/* 5 — Input Controls */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Input Controls</p>
              <p>
                Parts I-C and IV now let you switch between a <span className="text-foreground font-medium">table view</span> (for when you want to see everything at once) and a <span className="text-foreground font-medium">card view</span> (for when you want to pretend it&apos;s not that many fields). Part IV columns are also resizable now, because some agencies have very long project names.
              </p>
            </div>

            {/* 6 — Save Reminders */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Save Reminders</p>
              <p>
                There were no save reminders before. You would just close the tab and lose everything. That is no longer the case — the editor now nudges you when you have unsaved changes, so you can actually leave your desk without a minor crisis.
              </p>
            </div>

            {/* 7 — Diagrams */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Diagrams</p>
              <p>
                Network and architecture diagram sections now let you <span className="text-foreground font-medium">upload images directly from your computer</span>. No more broken links because someone renamed a folder on the shared drive.
              </p>
            </div>

            {/* 8 — Reliability */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Reliability</p>
              <p>
                The editor now notices when you&apos;ve changed something and forgot to save — so it will remind you before you lose an hour of work. Part IV also adds up your budget across all three coverage years automatically, because the ISSP is stressful enough without doing mental math.
              </p>
            </div>

            {/* Footer gag */}
            <p className="text-xs text-muted-foreground/50 italic text-center border-t pt-4">
              Now if I could actually let you upload your agency&apos;s logo into the PDF headers, that would really be something, huh? Hahaha. Soon.
            </p>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
