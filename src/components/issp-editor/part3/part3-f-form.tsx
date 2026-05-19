"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, BarChart3, FolderKanban } from "lucide-react";

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
  kpiSet,
  onChange,
}: {
  project: ProjectSummary;
  kpiSet: ProjectKpiSet;
  onChange: (updated: ProjectKpiSet) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function addRow() {
    onChange({
      ...kpiSet,
      rows: [...kpiSet.rows, { id: generateId(), ...DEFAULT_ROW }],
    });
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
            <CardTitle className="text-sm font-semibold truncate">{project.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {project.projectCategory === "crossAgency" ? "Cross-Agency" : "Internal"} ·{" "}
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
          <div className="overflow-x-auto">
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
                  <tr key={row.id} className="hover:bg-muted/10">
                    <td className="border px-1 py-1">
                      <select
                        className="w-full px-2 py-1.5 text-xs bg-transparent rounded focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
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
                        className="w-full px-2 py-1.5 text-xs bg-transparent rounded focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., % reduction in processing time"
                        value={row.indicator}
                        onChange={(e) => updateRow(row.id, "indicator", e.target.value)}
                      />
                    </td>
                    {(["baseline", "year1Target", "year2Target", "year3Target"] as const).map((field) => (
                      <td key={field} className="border px-1 py-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-xs text-center bg-transparent rounded focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="—"
                          value={row[field]}
                          onChange={(e) => updateRow(row.id, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs bg-transparent rounded focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., Monthly reports"
                        value={row.dataCollectionMethod}
                        onChange={(e) => updateRow(row.id, "dataCollectionMethod", e.target.value)}
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-xs bg-transparent rounded focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
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

  const { status, debouncedSave } = useLocalSave("part3");

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

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section F
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Performance Framework</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define KPIs and targets for each ICT project. Track baseline and 3-year targets.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

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

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<Link href="/editor/part3/e2" />}>
          ← Cross-Agency Projects
        </Button>
        <Button nativeButton={false} render={<Link href="/editor/part4/year1" />}>
          Next: Part IV - Resource Requirements →
        </Button>
      </div>
    </div>
  );
}
