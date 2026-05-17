"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ChevronDown,
} from "lucide-react";

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

interface NavSection {
  label: string;
  items: { label: string; href: string; subLabel?: string }[];
}

function buildNavSections(docId: string): NavSection[] {
  const base = `/dashboard/documents/${docId}`;
  return [
    {
      label: "Part I: Agency Profile",
      items: [
        { label: "A. Mandate, Vision & Mission", href: `${base}/part1/a`, subLabel: "Legal basis, vision, mission, org outcomes" },
        { label: "B. Organization Structure", href: `${base}/part1/b`, subLabel: "CIO, Focal person, human capital" },
        { label: "C. Stakeholder Analysis", href: `${base}/part1/c`, subLabel: "Key stakeholders and transactions" },
      ],
    },
    {
      label: "Part II: Current ICT Assessment",
      items: [
        { label: "A. Strategic Concerns", href: `${base}/part2/a` },
        { label: "B. Network & Cybersecurity", href: `${base}/part2/b` },
        { label: "C. IS Inventory", href: `${base}/part2/c` },
        { label: "D. E-Government Programs", href: `${base}/part2/d` },
      ],
    },
    {
      label: "Part III: Proposed ICT Strategy",
      items: [
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
      label: "Part IV: Resource Requirements",
      items: [
        { label: "Year 1 Breakdown", href: `${base}/part4/year1` },
        { label: "Year 2 Breakdown", href: `${base}/part4/year2` },
        { label: "Year 3 Breakdown", href: `${base}/part4/year3` },
        { label: "Summary of Investments", href: `${base}/part4/summary` },
      ],
    },
  ];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REVIEW: "Under Review",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
};

interface IsspSidebarProps {
  doc: DocInfo;
  collapsed: boolean;
  onToggle: () => void;
}

export function IsspSidebar({ doc, collapsed, onToggle }: IsspSidebarProps) {
  const pathname = usePathname();
  const sections = buildNavSections(doc.id);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.label))
  );

  function toggleSection(label: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center border-r bg-card py-4 gap-2">
        <Button size="icon" variant="ghost" aria-label="Expand sidebar" onClick={onToggle} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Separator />
        <FileText className="h-5 w-5 text-muted-foreground mt-2" />
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b">
        {/* Row 1: back link + collapse button */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All Documents
          </Link>
          <Button size="icon" variant="ghost" aria-label="Collapse sidebar" onClick={onToggle} className="h-6 w-6 -mr-0.5">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* Row 2: doc info */}
        <div className="px-4 pb-4">
          <p className="text-sm font-semibold leading-tight truncate">{doc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doc.startYear}–{doc.endYear} · {doc.agencyAcronym}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABELS[doc.status] ?? doc.status}
            </Badge>
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
        {/* Overview */}
        <Link
          href={`/dashboard/documents/${doc.id}`}
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === `/dashboard/documents/${doc.id}`
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          Overview
        </Link>

        {/* Section tree */}
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.label);
          const isActiveSection = section.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );

          return (
            <div key={section.label} className="mt-2">
              <button
                onClick={() => toggleSection(section.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors text-left",
                  isActiveSection
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
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

      <div className="px-4 py-3 border-t">
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed select-none text-center">
          made with ❤️ <em>para sa bayan</em>
          <br />
          <a
            href="https://www.instagram.com/carlosanton.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground/70 transition-colors underline underline-offset-2"
          >
            @carlosanton.io
          </a>
        </p>
      </div>
    </aside>
  );
}
