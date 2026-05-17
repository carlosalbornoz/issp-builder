"use client";

import { useState } from "react";
import { IsspSidebar } from "./issp-sidebar";

interface DocInfo {
  id: string;
  title: string;
  startYear: number;
  endYear: number;
  status: string;
  amendmentNumber: number;
  scope: string;
  agencyName: string;
  agencyAcronym: string;
  agencyType: string;
  creatorName: string;
  hasPart1: boolean;
}

interface IsspEditorLayoutProps {
  doc: DocInfo;
}

export function IsspEditorLayout({ doc }: IsspEditorLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      <IsspSidebar
        doc={doc}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto p-8">
          {/* Overview content when no section selected */}
          <IsspOverview doc={doc} />
        </div>
      </main>
    </div>
  );
}

function IsspOverview({ doc }: { doc: DocInfo }) {
  const base = `/dashboard/documents/${doc.id}`;

  const sections = [
    {
      part: "Part I",
      title: "Agency Profile & Strategic Context",
      color: "from-blue-500/10 to-blue-600/5",
      accent: "text-blue-600",
      subsections: [
        { label: "A. Mandate, Vision & Mission", href: `${base}/part1/a` },
        { label: "B. Organization Structure", href: `${base}/part1/b` },
        { label: "C. Stakeholder Analysis", href: `${base}/part1/c` },
      ],
    },
    {
      part: "Part II",
      title: "Current ICT Assessment",
      color: "from-amber-500/10 to-amber-600/5",
      accent: "text-amber-600",
      subsections: [
        { label: "A. Strategic Concerns", href: `${base}/part2/a` },
        { label: "B. Network & Cybersecurity", href: `${base}/part2/b` },
        { label: "C. IS Inventory", href: `${base}/part2/c` },
        { label: "D. E-Government Programs", href: `${base}/part2/d` },
      ],
    },
    {
      part: "Part III",
      title: "Proposed ICT Strategy",
      color: "from-green-500/10 to-green-600/5",
      accent: "text-green-600",
      subsections: [
        { label: "A. Proposed Infrastructure", href: `${base}/part3/a` },
        { label: "B. Enterprise Architecture", href: `${base}/part3/b` },
        { label: "C. Proposed Human Capital", href: `${base}/part3/c` },
        { label: "D. Proposed IS", href: `${base}/part3/d` },
        { label: "E.1 Internal Projects", href: `${base}/part3/e1` },
        { label: "E.2 Cross-Agency Projects", href: `${base}/part3/e2` },
        { label: "F. Performance Framework", href: `${base}/part3/f` },
      ],
    },
    {
      part: "Part IV",
      title: "Resource Requirements",
      color: "from-purple-500/10 to-purple-600/5",
      accent: "text-purple-600",
      subsections: [
        { label: "Year 1 Breakdown", href: `${base}/part4/year1` },
        { label: "Year 2 Breakdown", href: `${base}/part4/year2` },
        { label: "Year 3 Breakdown", href: `${base}/part4/year3` },
        { label: "Summary of Investments", href: `${base}/part4/summary` },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-muted-foreground mt-1">
          {doc.agencyName} · {doc.startYear}–{doc.endYear}
          {doc.amendmentNumber > 0 && ` · Amendment #${doc.amendmentNumber}`}
        </p>
      </div>

      {/* Part cards */}
      <div className="grid gap-4">
        {sections.map((section) => (
          <div
            key={section.part}
            className={`rounded-xl border bg-gradient-to-br ${section.color} p-5`}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${section.accent}`}>
                {section.part}
              </span>
              <h2 className="text-base font-semibold">{section.title}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {section.subsections.map((sub) => (
                <a
                  key={sub.href}
                  href={sub.href}
                  className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-2.5 text-sm font-medium hover:bg-background hover:shadow-sm transition-all group"
                >
                  <span>{sub.label}</span>
                  <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
