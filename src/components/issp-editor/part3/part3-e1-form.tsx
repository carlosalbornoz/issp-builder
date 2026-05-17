"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposedSystem } from "./part3-d-form";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IctProject {
  id: string;
  title: string;
  description: string;
  objectives: string;
  projectType: "IS_DRIVEN" | "STANDALONE" | "";
  linkedSystemIds: string[];
  strategicAlignment: string[];
  harmonizationFramework: string[];
  implementingUnit: string;
  leadAgency?: string;
  implementingAgencies?: string;
  fundingSource: string;
  totalProjectCost: number;
  year1Deliverables: string;
  year2Deliverables: string;
  year3Deliverables: string;
  duration: string;
}

function generateId() {
  return `proj-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_PROJECT: Omit<IctProject, "id"> = {
  title: "",
  description: "",
  objectives: "",
  projectType: "",
  linkedSystemIds: [],
  strategicAlignment: [],
  harmonizationFramework: [],
  implementingUnit: "",
  totalProjectCost: 0,
  fundingSource: "",
  duration: "",
  year1Deliverables: "",
  year2Deliverables: "",
  year3Deliverables: "",
};

// Per MITHI Resolution 2025-01 / ISSP Guidelines 2026
const STRATEGIC_ALIGNMENT_OPTIONS = [
  { value: "Public Investment Program", hint: "CO exceeding threshold; supports PDP long-term targets" },
  { value: "National Cybersecurity Plan", hint: "Security software (Firewalls, WAF, MFA), SOC, or protects sensitive data" },
  { value: "E-Government Master Plan", hint: "Integrates with other agencies, uses GovNet/PNPKI, or digitizes frontline services" },
  { value: "Program Convergence Budgeting", hint: "Joint initiative with other agencies; funding from multiple offices" },
  { value: "Others", hint: "Aligned with other national/agency-level plans" },
];

const HARMONIZATION_OPTIONS = [
  { value: "National Prioritization", hint: "Cabinet-level priority or mandatory for national platform (e.g., eGov PH Super App)" },
  { value: "Resource Optimization", hint: "Leverages existing government resources (CSE, GovNet, Government Cloud)" },
  { value: "Interoperability Framework", hint: "API layer or data-sharing module for cross-agency use (PeGIF compliance)" },
  { value: "Cross-Agency Collaboration", hint: "Part of a JMC or shared service agreement" },
  { value: "Scalability and Sustainability", hint: "Includes SPAR mechanism; KPIs align with PREXC" },
];

const FUNDING_OPTIONS = [
  "General Appropriations Act (GAA)",
  "Foreign-Assisted",
  "Locally Funded",
  "Other Income Generating Sources",
];

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  docId,
  project,
  index,
  proposedSystems,
  isCrossAgency,
  onUpdate,
  onRemove,
}: {
  docId: string;
  project: IctProject;
  index: number;
  proposedSystems: ProposedSystem[];
  isCrossAgency: boolean;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const linkedSystems = proposedSystems.filter((s) =>
    project.linkedSystemIds.includes(s.id)
  );

  function toggleLinkedSystem(sysId: string) {
    const ids = project.linkedSystemIds.includes(sysId)
      ? project.linkedSystemIds.filter((i) => i !== sysId)
      : [...project.linkedSystemIds, sysId];
    onUpdate("linkedSystemIds", ids);
  }

  function toggleAlignment(value: string) {
    const current = project.strategicAlignment;
    onUpdate(
      "strategicAlignment",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  function toggleHarmonization(value: string) {
    const current = Array.isArray(project.harmonizationFramework)
      ? project.harmonizationFramework
      : [];
    onUpdate(
      "harmonizationFramework",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  const harmonizationArr = Array.isArray(project.harmonizationFramework)
    ? project.harmonizationFramework
    : [];

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderKanban className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {isCrossAgency ? "Cross-Agency" : "Internal"} Project #{index + 1}
            </span>
            {project.projectType && (
              <Badge variant="secondary" className="text-xs h-5">
                {project.projectType === "IS_DRIVEN" ? "IS-Driven" : "Standalone"}
              </Badge>
            )}
            {linkedSystems.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                <Link2 className="h-3 w-3" />
                {linkedSystems.length} IS
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-0.5">
            {project.title || <span className="text-muted-foreground italic">Untitled Project</span>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove project"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Quick summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Title</Label>
          <Input
            placeholder="e.g., Citizen Feedback Portal Development"
            value={project.title}
            onChange={(e) => onUpdate("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Type</Label>
          <Select
            value={project.projectType}
            onValueChange={(v: string | null) => v && onUpdate("projectType", v)}
          >
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IS_DRIVEN">IS-Driven (linked to a proposed IS)</SelectItem>
              <SelectItem value="STANDALONE">Standalone (infrastructure only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Full details */}
      {expanded && (
        <div className="p-4 space-y-6">
          {/* Description + objectives */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
              <Textarea
                placeholder="Brief description of what this project entails..."
                value={project.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Objectives</Label>
              <Textarea
                placeholder="List the project objectives..."
                value={project.objectives}
                onChange={(e) => onUpdate("objectives", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Cross-agency specific */}
          {isCrossAgency && (
            <div className="grid sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Lead Agency</Label>
                <Input
                  placeholder="e.g., DICT"
                  value={project.leadAgency ?? ""}
                  onChange={(e) => onUpdate("leadAgency", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Implementing Agencies</Label>
                <Input
                  placeholder="e.g., DICT, DBM, CSC"
                  value={project.implementingAgencies ?? ""}
                  onChange={(e) => onUpdate("implementingAgencies", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Linked IS (only for IS-driven) */}
          {project.projectType === "IS_DRIVEN" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Linked Proposed Systems
              </Label>
              {proposedSystems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No proposed systems defined yet.{" "}
                  <a href={`/dashboard/documents/${docId}/part3/d`} className="text-primary hover:underline">
                    Add systems in Part III-D →
                  </a>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {proposedSystems.map((sys) => {
                    const linked = project.linkedSystemIds.includes(sys.id);
                    return (
                      <button
                        key={sys.id}
                        type="button"
                        onClick={() => toggleLinkedSystem(sys.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          linked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {linked && <Link2 className="h-3 w-3" />}
                        {sys.name || "Unnamed system"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Strategic alignment */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Strategic Alignment
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {STRATEGIC_ALIGNMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <Checkbox
                    checked={project.strategicAlignment.includes(opt.value)}
                    onCheckedChange={() => toggleAlignment(opt.value)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-medium">{opt.value}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Harmonization Framework */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Harmonization Framework
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {HARMONIZATION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <Checkbox
                    checked={harmonizationArr.includes(opt.value)}
                    onCheckedChange={() => toggleHarmonization(opt.value)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-medium">{opt.value}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Implementation details */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Implementing Unit</Label>
              <Input
                placeholder="e.g., ICT Division"
                value={project.implementingUnit}
                onChange={(e) => onUpdate("implementingUnit", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration</Label>
              <Input
                placeholder="e.g., 2026–2028"
                value={(project as IctProject).duration ?? ""}
                onChange={(e) => onUpdate("duration", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Funding Source</Label>
              <Select
                value={project.fundingSource}
                onValueChange={(v: string | null) => v && onUpdate("fundingSource", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {FUNDING_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Project Cost (₱)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={project.totalProjectCost || ""}
              onChange={(e) => onUpdate("totalProjectCost", Number(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">Must match sum of yearly costs in Part IV</p>
          </div>

          {/* 3-Year Milestones */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              3-Year Deliverables / Milestones
            </Label>
            <div className="grid sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((yr) => {
                const key = `year${yr}Deliverables` as keyof IctProject;
                return (
                  <div key={yr} className="space-y-1.5">
                    <Label className="text-xs font-semibold">Year {yr}</Label>
                    <Textarea
                      placeholder={`Year ${yr} deliverables…`}
                      value={project[key] as string}
                      onChange={(e) => onUpdate(key, e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared project list ───────────────────────────────────────────────────────

function ProjectList({
  docId,
  proposedSystems,
  initialProjects,
  isCrossAgency,
  onSave,
}: {
  docId: string;
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
  isCrossAgency: boolean;
  onSave: (projects: IctProject[]) => void;
}) {
  const [projects, setProjects] = useState<IctProject[]>(initialProjects);

  function update(next: IctProject[]) {
    setProjects(next);
    onSave(next);
  }

  function addProject() {
    update([...projects, { id: generateId(), ...DEFAULT_PROJECT }]);
  }

  function removeProject(id: string) {
    update(projects.filter((p) => p.id !== id));
  }

  function updateProject(id: string, field: string, value: unknown) {
    update(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  const totalCost = projects.reduce((s, p) => s + (p.totalProjectCost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{projects.length}</span>
          <span className="text-xs text-muted-foreground">
            {isCrossAgency ? "Cross-Agency" : "Internal"} Projects
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-green-600">
            ₱{totalCost.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">Total Est. Cost</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isCrossAgency ? "Cross-Agency ICT Projects" : "Internal ICT Projects"}
          </h2>
          <Button variant="outline" size="sm" onClick={addProject} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>

        {projects.length === 0 && (
          <Card className="border-dashed">
            <CardContent
              className="flex flex-col items-center justify-center py-12 cursor-pointer"
              onClick={addProject}
            >
              <FolderKanban className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No projects yet.</p>
              <p className="text-xs text-primary hover:underline">Add the first project →</p>
            </CardContent>
          </Card>
        )}

        {projects.map((project, idx) => (
          <ProjectCard
            key={project.id}
            docId={docId}
            project={project}
            index={idx}
            proposedSystems={proposedSystems}
            isCrossAgency={isCrossAgency}
            onUpdate={(field, value) => updateProject(project.id, field, value)}
            onRemove={() => removeProject(project.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── E.1 — Internal Projects ───────────────────────────────────────────────────

export function Part3E1Form({
  docId,
  proposedSystems,
  initialProjects,
}: {
  docId: string;
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
}) {
  const { status, debouncedSave } = useAutoSave({
    url: `/api/issp/documents/${docId}/part3`,
    method: "PUT",
  });

  const save = useCallback(
    (projects: IctProject[]) => debouncedSave({ internalProjects: projects }),
    [debouncedSave]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section E.1
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Internal ICT Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projects implemented solely by your agency — link IS-driven projects to systems defined in Part III-D.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      <ProjectList
        docId={docId}
        proposedSystems={proposedSystems}
        initialProjects={initialProjects}
        isCrossAgency={false}
        onSave={save}
      />

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/d`} />}>
          ← Proposed IS
        </Button>
        <Button nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/e2`} />}>
          Next: Cross-Agency Projects →
        </Button>
      </div>
    </div>
  );
}

// ─── E.2 — Cross-Agency Projects ──────────────────────────────────────────────

export function Part3E2Form({
  docId,
  proposedSystems,
  initialProjects,
}: {
  docId: string;
  proposedSystems: ProposedSystem[];
  initialProjects: IctProject[];
}) {
  const { status, debouncedSave } = useAutoSave({
    url: `/api/issp/documents/${docId}/part3`,
    method: "PUT",
  });

  const save = useCallback(
    (projects: IctProject[]) => debouncedSave({ crossAgencyProjects: projects }),
    [debouncedSave]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section E.2
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Cross-Agency ICT Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projects involving multiple agencies. Specify the lead and implementing agencies.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      <ProjectList
        docId={docId}
        proposedSystems={proposedSystems}
        initialProjects={initialProjects}
        isCrossAgency={true}
        onSave={save}
      />

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/e1`} />}>
          ← Internal Projects
        </Button>
        <Button nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/f`} />}>
          Next: Performance Framework →
        </Button>
      </div>
    </div>
  );
}
