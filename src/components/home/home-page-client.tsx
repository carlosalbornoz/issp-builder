"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2, FolderOpen, BookOpen, FileText, AlertTriangle,
  Loader2, Check, BarChart2, Database, LayoutGrid, TrendingUp, ArrowRight,
  Sparkles, ChevronDown, FileClock, Trash2,
} from "lucide-react";
import { CompletionBar } from "@/components/ui/completion-bar";
import { RelativeTime } from "@/components/ui/relative-time";
import { ALL_SECTIONS, computeStatus } from "@/lib/sections";
import type { IsspDocument } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsspStore } from "@/lib/store";
import { NewIsspDialog } from "@/components/editor/new-issp-dialog";
import { useTheme, THEMES } from "@/lib/theme";
import { toast } from "sonner";

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

// ── Continue where you left off (Phase 6 — the app's hidden state must be self-evident) ──

function ContinueCard({
  doc,
  onContinue,
  onClear,
}: {
  doc: IsspDocument;
  onContinue: () => void;
  onClear: () => Promise<{ success: true } | { success: false; error: string }>;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const sectionMeta = doc.sectionMeta ?? {};
  const doneCount = ALL_SECTIONS.filter((s) => computeStatus(sectionMeta[s.id]) === "done").length;

  return (
    <div className="space-y-2 min-w-0">
      <p className="text-xs font-semibold text-primary uppercase tracking-wide px-1">Continue where you left off</p>
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileClock className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm line-clamp-2 break-words">{doc.title || "Untitled ISSP"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doc.agency.acronym || doc.agency.name} · {doc.startYear}–{doc.endYear} · last edited{" "}
            <RelativeTime iso={doc.updatedAt} />
          </p>
        </div>
      </div>
      <CompletionBar numerator={doneCount} denominator={ALL_SECTIONS.length} showLabel />
      {!confirmingClear ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" className="gap-1.5" onClick={onContinue}>
            Continue editing
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear browser data…
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-xs space-y-2">
          <p className="text-foreground/80">
            This deletes only the copy stored in <strong>this browser</strong> — any <code>.issp</code>{" "}
            files you saved to disk are untouched. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              disabled={clearing}
              onClick={async () => {
                setClearing(true);
                const result = await onClear();
                setClearing(false);
                if (result.success) {
                  setConfirmingClear(false);
                  toast.success("Browser draft cleared.");
                } else {
                  toast.error(result.error);
                }
              }}
            >
              {clearing ? "Deleting…" : "Delete permanently"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmingClear(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePageClient({ aboutHtml, privacyHtml }: { aboutHtml: string; privacyHtml: string; }) {
  const router = useRouter();
  const { doc, loading: storeLoading, loadFromFile, clearDoc, saveStatus, saveError } = useIsspStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  // True from the moment a load/create succeeds until the editor route takes over —
  // keeps the splash from flashing the "Continue where you left off" card mid-navigation.
  const [navigating, setNavigating] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleIntroOpen, setSampleIntroOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const confettiRef = useRef<((opts: object) => void) | null>(null);
  const whatsNewScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (whatsNewOpen && whatsNewScrollRef.current) whatsNewScrollRef.current.scrollTop = 0;
  }, [whatsNewOpen]);

  useEffect(() => {
    import("canvas-confetti").then((mod) => {
      // useWorker: false avoids blob: URL worker creation, which CSP extensions block
      confettiRef.current = mod.default.create(null as never, { useWorker: false, resize: true });
    });
  }, []);

  function openWhatsNew() {
    setWhatsNewOpen(true);
    setTimeout(() => {
      const fire = confettiRef.current;
      if (!fire) return;
      const colors = ["#0038A8", "#CE1126", "#FCD116", "#ffffff"];
      const end = Date.now() + 2200;
      (function frame() {
        fire({ particleCount: 4, angle: 60,  spread: 52, origin: { x: 0, y: 0.6 }, colors });
        fire({ particleCount: 4, angle: 120, spread: 52, origin: { x: 1, y: 0.6 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }, 120);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(null);
    // Flip the guard before the doc mutates, so the splash never re-renders into
    // the Continue card between loadFromFile's setDoc and navigation.
    setNavigating(true);
    const result = await loadFromFile(file);
    if (result.success) { router.push("/editor"); } else { setNavigating(false); setLoadError(result.error ?? "Unknown error"); }
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
      setNavigating(true);
      const result = await loadFromFile(file);
      if (result.success) { router.push("/editor"); } else { setNavigating(false); setLoadError(result.error ?? "Unknown error"); }
    } catch { setNavigating(false); setLoadError("Could not load sample file."); }
    finally { setSampleLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 logo-eq-hover">
            {/* Part-color accent strip */}
            <div className="flex gap-0.5 mr-1">
              {PART_COLORS.map((c, i) => (
                <span key={c} className="w-1.5 h-4 rounded-full logo-bar" style={{ background: c, animationDelay: `${i * 0.14}s` }} />
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
      <section className="min-h-[calc(100dvh-3.5rem)] flex flex-col border-b bg-secondary/40">
        {/* Branding — anchored near the top of the first viewport */}
        <div className="w-full max-w-md mx-auto px-6 pt-12 text-center space-y-2">
          {/* Part-color accent strips */}
          <div className="flex justify-center gap-1 mb-4 logo-eq">
            {PART_COLORS.map((c, i) => (
              <span key={c} className="w-2 h-6 rounded-full logo-bar" style={{ background: c, animationDelay: `${i * 0.14}s` }} />
            ))}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">ISSP Builder</h1>
          <p className="text-sm text-muted-foreground">Build your agency&apos;s 3-year Information Systems Strategic Plan</p>

          {/* What's New pill — part of the brand cluster, not the action menu */}
          <div className="flex justify-center pt-4">
            <button
              onClick={openWhatsNew}
              className="animate-glow-orbit inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              What&apos;s new — June 20–21, 2026
            </button>
          </div>
        </div>

        {/* Action area — centered in the space between branding and chip */}
        <div className="w-full max-w-md mx-auto px-6 py-10 my-auto">

          {/* With a detected session the splash leads with Continue only;
              everything else collapses behind an explicit disclosure. */}
          {(() => {
            const hasSession = !storeLoading && !!doc;

            // While checking IDB, or once a load/create has fired navigation, hold a
            // spinner — don't briefly flash the action cards or the Continue card.
            if (storeLoading || navigating) {
              return (
                <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed bg-card/50 py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {navigating ? "Opening the editor…" : "Checking this browser for saved work…"}
                  </p>
                </div>
              );
            }

            const startNewCard = (
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
            );

            const loadFileCard = (
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
            );

            if (!hasSession) {
              return (
                <div className="grid gap-3">
                  <>
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

                      {startNewCard}
                      {loadFileCard}
                  </>
                </div>
              );
            }

            return (
              <div className="grid gap-3">
                <ContinueCard doc={doc!} onContinue={() => router.push("/editor")} onClear={clearDoc} />

                <button
                  type="button"
                  onClick={() => setMoreOptionsOpen((o) => !o)}
                  className="flex items-center gap-3 py-1 text-left group"
                  aria-expanded={moreOptionsOpen}
                >
                  <div className="flex-1 h-px bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                    Other options — start new, load a file, or view the sample
                    <ChevronDown className={`w-3 h-3 transition-transform ${moreOptionsOpen ? "rotate-180" : ""}`} />
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </button>

                {moreOptionsOpen && (
                  <>
                    <p className="text-xs text-muted-foreground rounded-lg border border-warning-border bg-warning-bg px-3 py-2">
                      These replace the ISSP currently stored in this browser — save it to a{" "}
                      <code className="bg-muted px-1 rounded">.issp</code> file first if you want to keep it.
                    </p>
                    {startNewCard}
                    {loadFileCard}
                    <button
                      type="button"
                      onClick={() => setSampleIntroOpen(true)}
                      disabled={sampleLoading}
                      className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                    >
                      {sampleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                      View the sample ISSP (NCWTR demo)
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          <input ref={fileInputRef} type="file" accept=".issp,application/json" className="hidden" onChange={handleFileChange} />

          {(loadError || (saveStatus === "error" && saveError)) && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loadError ?? saveError}</span>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Free to use · No account required · Local-first, works in your browser
          </p>
        </div>

        {/* Attribution chip — docked at the bottom of the first viewport, macOS-dock style */}
        <div className="flex justify-center pb-9 px-6">
          <p className="chip-attr select-none rounded-full bg-foreground text-background/85 px-4 py-1.5 text-xs font-semibold text-center shadow-lg shadow-foreground/20">
            Made with <span className="chip-heart">❤️</span> <em>para sa bayan</em> ·{" "}
            <a
              href="https://www.instagram.com/carlosanton.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background underline underline-offset-2 hover:opacity-75 transition-opacity"
            >
              Carlos Antonio Albornoz
            </a>
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
      <NewIsspDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} onCreated={() => { setNavigating(true); router.push("/editor"); }} />
      <ContentModal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this project" html={aboutHtml} />
      <ContentModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy & architecture" html={privacyHtml} />

      {/* What's New modal */}
      <Dialog open={whatsNewOpen} onOpenChange={setWhatsNewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[82vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What&apos;s new — June 20–21, 2026
            </DialogTitle>
          </DialogHeader>
          <div ref={whatsNewScrollRef} className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-muted-foreground leading-relaxed">
            <div tabIndex={0} className="h-0 w-0 overflow-hidden outline-none" aria-hidden="true" />

            {/* Annex 1 — headline feature */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Annex 1 — ICT Asset Inventory is Live</p>
              <p>
                The spreadsheet-looking one. Offices now have their own{" "}
                <span className="text-foreground font-medium">standalone form at <code className="text-xs bg-muted px-1 rounded">/annex1</code></span>{" "}
                — pick your office type (Central, Regional, or Field), fill in equipment and software counts, and download a{" "}
                <code className="text-xs bg-muted px-1 rounded">.issp</code> file. Send that file to your CIO.
              </p>
              <p>
                In the main editor, there&apos;s now an{" "}
                <span className="text-foreground font-medium">Annexes section in the sidebar</span>. Attach each office&apos;s{" "}
                <code className="text-xs bg-muted px-1 rounded">.issp</code> file there — the builder validates them, shows a count badge, and when you export to PDF,{" "}
                <span className="text-foreground font-medium">all offices print as a proper Annex 1</span> with per-office tables and a consolidated summary when multiple offices are attached.
              </p>
            </div>

            {/* Table/Cards toggle */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Table or Cards — You Choose</p>
              <p>
                The inventory form offers a{" "}
                <span className="text-foreground font-medium">Table / Cards toggle</span>. The table gives you the classic spreadsheet feel for scanning across all items at once. Cards give each ICT resource its own focused block — cleaner on smaller screens and easier when you&apos;re filling out one item at a time. Both views share the same data; switching doesn&apos;t reset anything.
              </p>
            </div>

            {/* Custom scrollbars */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Scrollbars That Match the Theme</p>
              <p>
                Browser default scrollbars are gone. The app now renders thin, rounded scrollbars using the same color tokens as the rest of the UI — so they shift with the theme automatically. Subtle on light, subtle on dark, and they stay out of the way of the content.
              </p>
            </div>

            {/* Previously — June 11–13 entry, collapsed */}
            <details className="group rounded-lg border bg-muted/30">
              <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground list-none [&::-webkit-details-marker]:hidden">
                Previously — June 11–13, 2026
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-2 space-y-4">
                <div className="rounded-lg border bg-muted/50 px-4 py-3 text-center">
                  <p className="text-xs font-medium italic text-foreground/75">
                    A full codebase review, an unreasonable amount of PDF wrangling, and a field-by-field audit against the official template later:
                  </p>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Checked Field-by-Field Against the DICT Template</p>
                    <p>After the May 25 ISSP Caravan, we audited every input in the builder against all 40 pages of the official DICT 2026 template. Most things already matched. The ones that didn&apos;t are fixed — including one checklist card that was quietly asking about an <span className="italic">accounting system</span> where the template asks about your <span className="text-foreground font-medium">Public Service Continuity Plan</span>. If you answered that one before today, kindly revisit it. 🙏</p>
                  </div>
                  <p><span className="text-foreground font-medium">Every System &amp; Project Reads Before It Edits</span> — Part II-C and Part III-D now open as read-only summaries. Editing is an explicit button, so browsing no longer risks a stray edit.</p>
                  <p><span className="text-foreground font-medium">Your Overview, Personalized</span> — greets you by time of day in regional languages, shows what you&apos;re working on, and keeps acronym casing correct (DepEd stays DepEd).</p>
                  <p><span className="text-foreground font-medium">Latest MITHI Advisories</span> — an advisory ticker in the editor surfaces the latest issuances and links straight to the source on dbm.gov.ph.</p>
                  <p><span className="text-foreground font-medium">This Page Now Remembers Your Work</span> — returns with a &ldquo;Continue where you left off&rdquo; card showing title, coverage period, last-edited time, and section progress.</p>
                  <p><span className="text-foreground font-medium">No More Mystery Adds</span> — new items scroll into view, get focus, and pulse briefly. Projects and systems start with a name-first dialog.</p>
                  <p><span className="text-foreground font-medium">KPIs on Phones</span> — Part III-F&apos;s nine-column table becomes a card per KPI on small screens.</p>
                  <p><span className="text-foreground font-medium">Agency Logo in the PDF</span> — upload a logo and it appears on the cover and every page header.</p>
                  <p><span className="text-foreground font-medium">eGov Checklist Follows the Template</span> — &ldquo;Not Utilizing&rdquo; reveals the official follow-up fields; unanswered cards are flagged instead of silently assumed &ldquo;No&rdquo;.</p>
                  <p><span className="text-foreground font-medium">Total Project Cost Computes Itself</span> — auto-calculated from Part III-E resource requirements. Peso fields format as you type.</p>
                  <p><span className="text-foreground font-medium">Mandatory Means Mandatory</span> — cybersecurity controls badge every DICT-required item; privacy questions are explicit Yes / No.</p>
                  <p><span className="text-foreground font-medium">PDF Layout &amp; Accuracy</span> — Part I is Page 1, TOC shows real page numbers, checkboxes actually check, internal codes no longer leak into print.</p>
                </div>
              </div>
            </details>

            {/* Previously — May 25 entry, collapsed */}
            <details className="group rounded-lg border bg-muted/30">
              <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground list-none [&::-webkit-details-marker]:hidden">
                Previously — May 25, 2026
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-3 text-xs">
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2.5">
                  <p className="text-amber-900/80 dark:text-amber-200/80">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">DICT ISSP Caravan</span> — at the official orientation (~212 agency officers), the DICT ISSP team gave this tool a nod. No official endorsement, but nobody told anyone to stop using it either, so we&apos;ll take that as a win. 🏅
                  </p>
                </div>
                <p><span className="text-foreground font-medium">Coverage period locked</span> — all ISSPs cover FY 2028–2030 per MITHI Resolution 2026-02; the fields are no longer editable.</p>
                <div className="space-y-1.5">
                  <p><span className="text-foreground font-medium">Themes</span> — four color themes. Dark mode people: you&apos;re welcome. Warm mode people: also you.</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all"
                        style={{
                          background: t.background,
                          borderColor: t.border,
                          color: t.id.includes("dark") ? "#F0EDE8" : "#18181B",
                          outline: theme === t.id ? `2px solid ${t.border}` : "none",
                          outlineOffset: "2px",
                          fontWeight: theme === t.id ? 600 : 400,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: theme === t.id ? "#22c55e" : t.secondary, border: theme === t.id ? "1.5px solid #16a34a" : `1px solid ${t.border}`, flexShrink: 0 }} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p><span className="text-foreground font-medium">Mobile editing</span> — the full editor works on phones; the sidebar becomes a hamburger menu with a full-screen section selector.</p>
                <p><span className="text-foreground font-medium">Table &amp; card views</span> — Parts I-C and IV switch between table and card layouts; Part IV columns are resizable.</p>
                <p><span className="text-foreground font-medium">Save reminders</span> — the editor nudges you when you have unsaved changes, before you lose an hour of work.</p>
                <p><span className="text-foreground font-medium">Diagram uploads</span> — upload network and architecture diagram images directly from your computer.</p>
              </div>
            </details>

            {/* Footer gag */}
            <p className="text-xs text-muted-foreground/50 italic text-center border-t pt-4">
              Next: validating Annex 1 against the actual DICT template, then the ISSP Repository. One spreadsheet at a time. 📋
            </p>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
