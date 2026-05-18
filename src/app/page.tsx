import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Database,
  BarChart2,
  ArrowRight,
  Check,
  FolderOpen,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";

// ── Browser chrome wrapper ─────────────────────────────────────────────────
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

// ── Data ───────────────────────────────────────────────────────────────────

// Fix 3: split live vs roadmap
const LIVE_FEATURE = {
  icon: FileText,
  title: "ISSP Creator / Editor",
  body: "A guided, part-by-part editor for agency ICT strategic plans — structured to the DICT 2026 template across all four parts. Works entirely in your browser with no account required. Save progress as a .issp file, export to PDF when ready.",
};

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

// Fix 4: real requirements, no fake percentages
const MITHI_CHECKLIST = [
  "Parts I–IV structured per DICT 2026 ISSP template",
  "PDF export aligned to DICT uniformity rules (Palatino, A4 landscape, 1-inch margins)",
  "eGov Programs Checklist (Part II-D) built in",
  "Network infrastructure & cybersecurity assessment sections",
  "Performance Framework with KPI tracking (Part III-F)",
  "Budget breakdown aligned to UACS coding structure",
] as const;

// ── Page ───────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ background: "#0038A8" }}
            >
              PH
            </div>
            <span className="font-semibold text-sm text-gray-900">ISSP Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Features
            </a>
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Privacy
            </Link>
            <Link
              href="/editor"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Open Editor <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — Fix 1: stacked layout so mockup has full width ── */}
      <section className="bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-0">

          {/* Copy block — centered, constrained width */}
          <div className="max-w-xl mx-auto text-center mb-10">

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              Civic Technology · Open Source
            </div>

            {/* Fix 5: audience signal */}
            <p className="text-xs text-gray-400 mb-5">
              For agency CIOs, ICT focal persons, and government transparency advocates.
            </p>

            {/* Fix 2: pain-focused headline */}
            <h1 className="text-[2.15rem] font-bold leading-tight text-gray-900 mb-4 tracking-tight">
              ISSP compliance,<br />finally structured.
            </h1>

            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              A volunteer-built tool that turns the DICT ISSP template into a guided, part-by-part editor.
              No account. No server. Works in your browser — save progress as a file, export to PDF when ready.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/editor"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#0038A8" }}
              >
                Start Building <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                See Features
              </a>
            </div>

            {/* Mini stats */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-center gap-6 flex-wrap">
              {[
                { value: "DICT 2026", label: "Template" },
                { value: "MITHI", label: "Aligned" },
                { value: "RA 10175", label: "E-Gov Act" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xs font-semibold text-gray-900">{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Browser mockup — full container width, flush to section border */}
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

      {/* ── Features — Fix 3: lead with live, roadmap below ── */}
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

          {/* Live feature — prominent full-width card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4 flex items-start gap-5">
            <div className="w-9 h-9 rounded-md border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">{LIVE_FEATURE.title}</h3>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Now
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 max-w-2xl">{LIVE_FEATURE.body}</p>
              <Link
                href="/editor"
                className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: "#0038A8" }}
              >
                Start building your ISSP <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Roadmap features */}
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

      {/* ── Why It Matters — Fix 4: checklist replaces fake progress bars ── */}
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

            {/* Fix 4: real DICT/MITHI requirements checklist */}
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
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — Fix 6: user lane primary, contributor secondary ── */}
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
            <Link
              href="/editor"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#0038A8" }}
            >
              Start Building <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              Learn More
            </a>
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
            <span className="text-xs text-gray-500">ISSP Platform — Open source. Built by volunteers.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/editor" className="hover:text-gray-700 transition-colors">Open Editor</Link>
            <span className="text-gray-200" aria-hidden>·</span>
            <a href="#features" className="hover:text-gray-700 transition-colors">Features</a>
            <span className="text-gray-200" aria-hidden>·</span>
            <Link href="/about" className="hover:text-gray-700 transition-colors">About</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
