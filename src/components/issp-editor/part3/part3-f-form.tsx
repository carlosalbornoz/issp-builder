"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, BarChart3, FolderKanban } from "lucide-react";
import { SectionShell } from "@/components/editor/section-shell";
import { revealNewItem } from "@/lib/reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiRow {
  id: string;
  hierarchy: "Intermediate Outcome" | "Immediate Outcome" | "Output" | "";
  indicator: string;
  baseline: string;
  year1Target: string;
  year2Target: string;
  year3Target: string;
  dataCollectionMethod: string;
  responsibleUnit: string;
}

interface ProjectKpiSet {
  projectTitle: string;
  projectCategory: "internal" | "crossAgency";
  rows: KpiRow[];
}

type PerformanceFramework = Record<string, ProjectKpiSet>;

interface ProjectSummary {
  id: string;
  title: string;
  projectCategory: "internal" | "crossAgency";
}

function generateId() {
  return `kpi-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_ROW: Omit<KpiRow, "id"> = {
  hierarchy: "",
  indicator: "",
  baseline: "",
  year1Target: "",
  year2Target: "",
  year3Target: "",
  dataCollectionMethod: "",
  responsibleUnit: "",
};

// ─── KPI Table per project ─────────────────────────────────────────────────────

function ProjectKpiTable({
  project,
  ordinal,
  kpiSet,
  onChange,
}: {
  project: ProjectSummary;
  ordinal: number;
  kpiSet: ProjectKpiSet;
  onChange: (updated: ProjectKpiSet) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function addRow() {
    const row = { id: generateId(), ...DEFAULT_ROW };
    onChange({ ...kpiSet, rows: [...kpiSet.rows, row] });
    revealNewItem(row.id);
  }

  function removeRow(id: string) {
    onChange({ ...kpiSet, rows: kpiSet.rows.filter((r) => r.id !== id) });
  }

  function updateRow<K extends keyof KpiRow>(rowId: string, field: K, value: KpiRow[K]) {
    onChange({
      ...kpiSet,
      rows: kpiSet.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {project.projectCategory === "crossAgency" ? "Cross-Agency ICT Project" : "Internal ICT Project"} #{ordinal}
            </span>
            <CardTitle className="text-sm font-semibold line-clamp-2 break-words">{project.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpiSet.rows.length} KPI{kpiSet.rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add KPI
          </Button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-0">
          {/* Mobile: card per KPI (the 9-column table is unusable on phones) */}
          <div className="md:hidden divide-y">
            {kpiSet.rows.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No KPIs yet.{" "}
                <button onClick={addRow} className="font-medium text-primary hover:underline">
                  Add one.
                </button>
              </p>
            )}
            {kpiSet.rows.map((row, idx) => (
              <div key={row.id} data-reveal-id={row.id} className="p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">KPI #{idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove KPI row"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Hierarchy of Results</label>
                  <select
                    className="w-full px-2 py-2 text-xs bg-card rounded border focus:outline-none focus:ring-1 focus:ring-ring"
                    value={row.hierarchy}
                    onChange={(e) => updateRow(row.id, "hierarchy", e.target.value as KpiRow["hierarchy"])}
                  >
                    <option value="">Select…</option>
                    <option>Intermediate Outcome</option>
                    <option>Immediate Outcome</option>
                    <option>Output</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Key Performance Indicator</label>
                  <input
                    type="text"
                    className="w-full px-2 py-2 text-xs bg-card rounded border focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g., % reduction in processing time"
                    value={row.indicator}
                    onChange={(e) => updateRow(row.id, "indicator", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["baseline", "Baseline"],
                      ["year1Target", "Year 1 Target"],
                      ["year2Target", "Year 2 Target"],
                      ["year3Target", "Year 3 Target"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input
                        type="text"
                        className="w-full px-2 py-2 text-xs bg-card rounded border focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="—"
                        value={row[field]}
                        onChange={(e) => updateRow(row.id, field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data Collection Method</label>
                    <input
                      type="text"
                      className="w-full px-2 py-2 text-xs bg-card rounded border focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="e.g., Monthly reports"
                      value={row.dataCollectionMethod}
                      onChange={(e) => updateRow(row.id, "dataCollectionMethod", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Responsibility to Collect Data</label>
                    <input
                      type="text"
                      className="w-full px-2 py-2 text-xs bg-card rounded border focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="e.g., ICT Division"
                      value={row.responsibleUnit}
                      onChange={(e) => updateRow(row.id, "responsibleUnit", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full template table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  <th className="border px-2 py-2 text-left font-semibold w-36">
                    Hierarchy of Results
                  </th>
                  <th className="border px-2 py-2 text-left font-semibold min-w-[200px]">
                    Key Performance Indicator
                  </th>
                  <th className="border px-2 py-2 text-center font-semibold w-24">Baseline</th>
                  <th className="border px-2 py-2 text-center font-semibold w-20">Year 1</th>
                  <th className="border px-2 py-2 text-center font-semibold w-20">Year 2</th>
                  <th className="border px-2 py-2 text-center font-semibold w-20">Year 3</th>
                  <th className="border px-2 py-2 text-left font-semibold min-w-[140px]">Data Collection Method</th>
                  <th className="border px-2 py-2 text-left font-semibold min-w-[120px]">Responsibility</th>
                  <th className="border px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {kpiSet.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="border px-3 py-6 text-center text-muted-foreground"
                    >
                      No KPIs yet.{" "}
                      <button
                        onClick={addRow}
                        className="font-medium text-primary hover:underline"
                      >
                        Add one.
                      </button>
                    </td>
                  </tr>
                )}
                {kpiSet.rows.map((row) => (
                  <tr key={row.id} data-reveal-id={row.id} className="hover:bg-muted/10">
                    <td className="border px-1 py-1">
                      <select
                        className="w-full px-2 py-1.5 text-xs bg-card/70 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        value={row.hierarchy}
                        onChange={(e) => updateRow(row.id, "hierarchy", e.target.value as KpiRow["hierarchy"])}
                      >
                        <option value="">Select…</option>
                        <option>Intermediate Outcome</option>
                        <option>Immediate Outcome</option>
                        <option>Output</option>
                      </select>
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs bg-card/70 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., % reduction in processing time"
                        value={row.indicator}
                        onChange={(e) => updateRow(row.id, "indicator", e.target.value)}
                      />
                    </td>
                    {(["baseline", "year1Target", "year2Target", "year3Target"] as const).map((field) => (
                      <td key={field} className="border px-1 py-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-xs text-center bg-card/70 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="—"
                          value={row[field]}
                          onChange={(e) => updateRow(row.id, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs bg-card/70 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., Monthly reports"
                        value={row.dataCollectionMethod}
                        onChange={(e) => updateRow(row.id, "dataCollectionMethod", e.target.value)}
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs bg-card/70 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., ICT Division"
                        value={row.responsibleUnit}
                        onChange={(e) => updateRow(row.id, "responsibleUnit", e.target.value)}
                      />
                    </td>
                    <td className="border px-1 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove KPI row"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part3FForm({
  allProjects,
  initialFramework,
}: {
  allProjects: ProjectSummary[];
  initialFramework: PerformanceFramework;
}) {
  // Initialize framework, ensuring an entry per project
  const [framework, setFramework] = useState<PerformanceFramework>(() => {
    const init: PerformanceFramework = { ...initialFramework };
    for (const p of allProjects) {
      if (!init[p.id]) {
        init[p.id] = {
          projectTitle: p.title,
          projectCategory: p.projectCategory,
          rows: [],
        };
      }
    }
    return init;
  });

  const { debouncedSave } = useLocalSave("part3", "part3/f");

  const update = useCallback(
    (next: PerformanceFramework) => {
      setFramework(next);
      debouncedSave({ performanceFramework: next });
    },
    [debouncedSave]
  );

  function updateProjectKpis(projectId: string, kpiSet: ProjectKpiSet) {
    update({ ...framework, [projectId]: kpiSet });
  }

  const totalKpis = Object.values(framework).reduce((s, k) => s + k.rows.length, 0);

  // Per-category ordinal for each project (#n restarts for Internal vs Cross-Agency).
  const ordinals = new Map<string, number>();
  const counters: Record<"internal" | "crossAgency", number> = { internal: 0, crossAgency: 0 };
  for (const p of allProjects) {
    counters[p.projectCategory] += 1;
    ordinals.set(p.id, counters[p.projectCategory]);
  }

  return (
    <SectionShell
      sectionId="part3/f"
      title="Performance Framework"
      description="Define key performance indicators (KPIs) for each ICT project to track outcomes over the plan period."
    >

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xl font-bold leading-none">{allProjects.length}</p>
            <p className="text-xs text-muted-foreground">Projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <div>
            <p className="text-xl font-bold leading-none">{totalKpis}</p>
            <p className="text-xs text-muted-foreground">Total KPIs</p>
          </div>
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No ICT projects defined yet.</p>
          <p className="text-xs">
            <Link href="/editor/part3/e1" className="text-primary hover:underline">
              Add projects in Part III-E →
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allProjects.map((project) => (
            <ProjectKpiTable
              key={project.id}
              project={project}
              ordinal={ordinals.get(project.id) ?? 0}
              kpiSet={
                framework[project.id] ?? {
                  projectTitle: project.title,
                  projectCategory: project.projectCategory,
                  rows: [],
                }
              }
              onChange={(kpiSet) => updateProjectKpis(project.id, kpiSet)}
            />
          ))}
        </div>
      )}

    </SectionShell>
  );
}
