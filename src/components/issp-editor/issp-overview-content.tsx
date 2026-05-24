"use client";

interface IsspOverviewContentProps {
  docId: string;
  agencyName: string;
  agencyAcronym: string;
  title: string;
  startYear: number;
  endYear: number;
  amendmentNumber: number;
}

const SECTIONS = [
  {
    part: "Part I",
    title: "Agency Profile & Strategic Context",
    colorClass: "from-blue-500/10 to-blue-600/5 border-blue-100",
    accentClass: "text-blue-600",
    subsections: [
      { label: "A. Mandate, Vision & Mission", key: "part1/a" },
      { label: "B. Organization Structure", key: "part1/b" },
      { label: "C. Stakeholder Analysis", key: "part1/c" },
    ],
  },
  {
    part: "Part II",
    title: "Current ICT Assessment",
    colorClass: "from-amber-500/10 to-amber-600/5 border-amber-100",
    accentClass: "text-amber-600",
    subsections: [
      { label: "A. Strategic Concerns", key: "part2/a" },
      { label: "B. Network & Cybersecurity", key: "part2/b" },
      { label: "C. IS Inventory", key: "part2/c" },
      { label: "D. E-Government Programs", key: "part2/d" },
    ],
  },
  {
    part: "Part III",
    title: "Proposed ICT Strategy",
    colorClass: "from-emerald-500/10 to-emerald-600/5 border-emerald-100",
    accentClass: "text-emerald-600",
    subsections: [
      { label: "A. Proposed Infrastructure", key: "part3/a" },
      { label: "B. Enterprise Architecture", key: "part3/b" },
      { label: "C. Proposed Human Capital", key: "part3/c" },
      { label: "D. Proposed IS", key: "part3/d" },
      { label: "E.1 Internal Projects", key: "part3/e1" },
      { label: "E.2 Cross-Agency Projects", key: "part3/e2" },
      { label: "F. Performance Framework", key: "part3/f" },
    ],
  },
  {
    part: "Part IV",
    title: "Resource Requirements",
    colorClass: "from-violet-500/10 to-violet-600/5 border-violet-100",
    accentClass: "text-violet-600",
    subsections: [
      { label: "Year 1 Breakdown", key: "part4/year1" },
      { label: "Year 2 Breakdown", key: "part4/year2" },
      { label: "Year 3 Breakdown", key: "part4/year3" },
      { label: "Summary of Investments", key: "part4/summary" },
    ],
  },
];

export function IsspOverviewContent({
  docId,
  agencyName,
  title,
  startYear,
  endYear,
  amendmentNumber,
}: IsspOverviewContentProps) {
  const base = `/dashboard/documents/${docId}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">{agencyName}</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {startYear}–{endYear}
              {amendmentNumber > 0 && ` · Amendment #${amendmentNumber}`}
              {" · "}Select a section below to start filling out your ISSP.
            </p>
          </div>
          <a
            href={`/api/issp/documents/${docId}/export`}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </a>
        </div>
      </div>

      {/* Part cards grid */}
      <div className="grid gap-5">
        {SECTIONS.map((section) => (
          <div
            key={section.part}
            className={`rounded-xl border bg-gradient-to-br ${section.colorClass} p-5`}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span
                className={`text-xs font-bold uppercase tracking-widest ${section.accentClass}`}
              >
                {section.part}
              </span>
              <h2 className="text-base font-semibold">{section.title}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {section.subsections.map((sub) => (
                <a
                  key={sub.key}
                  href={`${base}/${sub.key}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors group"
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
