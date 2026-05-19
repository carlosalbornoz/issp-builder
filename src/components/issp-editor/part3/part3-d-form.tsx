"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProposedSystem {
  id: string;
  name: string;
  classification: string;
  frontline: boolean;
  deploymentType: string;
  status: "FOR_DEVELOPMENT" | "FOR_ENHANCEMENT" | "";
  enhancementDetails: string;
  developmentStrategy: string;
  developmentPlatform: string;
  databaseName: string;
  dataStorage: string;
  internalUsers: number;
  externalUsers: number;
  owner: string;
  interoperability: {
    integrated: boolean;
    internalSystems: string;
    externalSystems: string;
  };
  pia: {
    processesPersonalInfo: boolean;
    piaRequired: boolean;
  };
  linkedProjectId: string;
}

function generateId() {
  return `ps-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_SYSTEM: Omit<ProposedSystem, "id"> = {
  name: "",
  classification: "",
  frontline: false,
  deploymentType: "",
  status: "",
  enhancementDetails: "",
  developmentStrategy: "",
  developmentPlatform: "",
  databaseName: "",
  dataStorage: "",
  internalUsers: 0,
  externalUsers: 0,
  owner: "",
  interoperability: { integrated: false, internalSystems: "", externalSystems: "" },
  pia: { processesPersonalInfo: false, piaRequired: false },
  linkedProjectId: "",
};

const CLASSIFICATION_OPTIONS = [
  { value: "G2C", label: "G2C – Government to Citizen" },
  { value: "G2B", label: "G2B – Government to Business" },
  { value: "G2G", label: "G2G – Government to Government" },
  { value: "G2E", label: "G2E – Government to Employee" },
  { value: "INTERNAL", label: "Internal / Operations" },
];
const DEPLOYMENT_OPTIONS = [
  { value: "ON_PREMISE", label: "On-Premise" },
  { value: "CLOUD", label: "Cloud-Hosted" },
  { value: "HYBRID", label: "Hybrid" },
];
const STRATEGY_OPTIONS = [
  { value: "IN_HOUSE", label: "In-House" },
  { value: "OUTSOURCED", label: "Outsourced" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "COTS", label: "COTS" },
  { value: "OPEN_SOURCE", label: "Open Source" },
];
const STORAGE_OPTIONS = [
  { value: "ON_PREMISE", label: "On-Premise" },
  { value: "CLOUD", label: "Cloud" },
  { value: "HYBRID", label: "Hybrid" },
];
const STATUS_OPTIONS = [
  { value: "FOR_DEVELOPMENT", label: "For Development", color: "bg-blue-100 text-blue-800" },
  { value: "FOR_ENHANCEMENT", label: "For Enhancement", color: "bg-amber-100 text-amber-800" },
];

const STATUS_COLOR: Record<string, string> = {
  FOR_DEVELOPMENT: "bg-blue-100 text-blue-800",
  FOR_ENHANCEMENT: "bg-amber-100 text-amber-800",
};

// ─── System Card ──────────────────────────────────────────────────────────────

function SystemCard({
  sys,
  index,
  isLinked,
  isNew,
  onUpdate,
  onRemove,
}: {
  sys: ProposedSystem;
  index: number;
  isLinked: boolean;
  isNew: boolean;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Proposed IS #{index + 1}</span>
            {sys.status && (
              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", STATUS_COLOR[sys.status])}>
                {STATUS_OPTIONS.find((o) => o.value === sys.status)?.label}
              </span>
            )}
            {sys.classification && (
              <Badge variant="outline" className="text-xs h-5">
                {CLASSIFICATION_OPTIONS.find((o) => o.value === sys.classification)?.label ?? sys.classification}
              </Badge>
            )}
            {isLinked && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                <Link2 className="h-3 w-3" />
                Has project
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-0.5">
            {sys.name || <span className="text-muted-foreground italic">Unnamed System</span>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove proposed system"
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

      {/* Quick row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">System Name</Label>
          <Input
            placeholder="e.g., Citizen Feedback Portal"
            value={sys.name}
            onChange={(e) => onUpdate("name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
          <Select items={STATUS_OPTIONS} value={sys.status} onValueChange={(v: string | null) => v && onUpdate("status", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Classification</Label>
          <Select
            items={CLASSIFICATION_OPTIONS}
            value={sys.classification}
            onValueChange={(v: string | null) => v && onUpdate("classification", v)}
          >
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {CLASSIFICATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 space-y-6">
          {/* Enhancement details — link back to Part II-C inventory */}
          {sys.status === "FOR_ENHANCEMENT" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Enhancement Details</Label>
              <Textarea
                placeholder="Describe what will be enhanced (new modules, platform upgrade, interoperability improvements)..."
                value={sys.enhancementDetails}
                onChange={(e) => onUpdate("enhancementDetails", e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          )}

          {/* Core fields */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Frontline Service?</Label>
              <label className="flex items-center gap-2 h-8 cursor-pointer">
                <Checkbox
                  checked={sys.frontline}
                  onCheckedChange={(v) => onUpdate("frontline", v === true)}
                />
                <span className="text-sm">Yes</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Deployment</Label>
              <Select
                items={DEPLOYMENT_OPTIONS}
                value={sys.deploymentType}
                onValueChange={(v: string | null) => v && onUpdate("deploymentType", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {DEPLOYMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">System Owner</Label>
              <Input
                placeholder="e.g., ICT Division"
                value={sys.owner}
                onChange={(e) => onUpdate("owner", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Dev Strategy</Label>
              <Select
                items={STRATEGY_OPTIONS}
                value={sys.developmentStrategy}
                onValueChange={(v: string | null) => v && onUpdate("developmentStrategy", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Platform / Framework</Label>
              <Input
                placeholder="e.g., React, Laravel"
                value={sys.developmentPlatform}
                onChange={(e) => onUpdate("developmentPlatform", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Database</Label>
              <Input
                placeholder="e.g., PostgreSQL"
                value={sys.databaseName}
                onChange={(e) => onUpdate("databaseName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Storage</Label>
              <Select
                items={STORAGE_OPTIONS}
                value={sys.dataStorage}
                onValueChange={(v: string | null) => v && onUpdate("dataStorage", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Internal Users</Label>
              <Input
                type="number" min={0}
                value={sys.internalUsers}
                onChange={(e) => onUpdate("internalUsers", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">External Users</Label>
              <Input
                type="number" min={0}
                value={sys.externalUsers}
                onChange={(e) => onUpdate("externalUsers", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Interoperability */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interoperability</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={sys.interoperability.integrated}
                onCheckedChange={(v) =>
                  onUpdate("interoperability", { ...sys.interoperability, integrated: v === true })
                }
              />
              <span className="text-sm">Will integrate with other systems</span>
            </label>
            {sys.interoperability.integrated && (
              <div className="grid sm:grid-cols-2 gap-3 pl-6">
                <Input
                  placeholder="Internal systems…"
                  value={sys.interoperability.internalSystems}
                  onChange={(e) =>
                    onUpdate("interoperability", { ...sys.interoperability, internalSystems: e.target.value })
                  }
                />
                <Input
                  placeholder="External systems…"
                  value={sys.interoperability.externalSystems}
                  onChange={(e) =>
                    onUpdate("interoperability", { ...sys.interoperability, externalSystems: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          {/* PIA */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Privacy</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sys.pia.processesPersonalInfo}
                  onCheckedChange={(v) =>
                    onUpdate("pia", { ...sys.pia, processesPersonalInfo: v === true })
                  }
                />
                <span className="text-sm">Will process personal information</span>
              </label>
              {sys.pia.processesPersonalInfo && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sys.pia.piaRequired}
                    onCheckedChange={(v) =>
                      onUpdate("pia", { ...sys.pia, piaRequired: v === true })
                    }
                  />
                  <span className="text-sm">PIA will be conducted</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-prompt: nudge user to create an ICT project for this new system */}
      {isNew && !isLinked && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span>Ready to plan implementation? Create an ICT project for this system in Part III-E.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/editor/part3/e1" />}
            className="shrink-0 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-7 px-2"
          >
            Go to Part III-E →
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part3DForm({
  initialSystems,
  existingProjectIds,
}: {
  initialSystems: ProposedSystem[];
  existingProjectIds: string[];
}) {
  const [systems, setSystems] = useState<ProposedSystem[]>(initialSystems);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const { status, debouncedSave } = useLocalSave("part3");

  const update = useCallback(
    (next: ProposedSystem[]) => {
      setSystems(next);
      debouncedSave({ proposedSystems: next });
    },
    [debouncedSave]
  );

  function addSystem() {
    const newId = generateId();
    setNewlyAddedIds((prev) => new Set(prev).add(newId));
    update([...systems, { id: newId, ...DEFAULT_SYSTEM }]);
  }

  function removeSystem(id: string) {
    update(systems.filter((s) => s.id !== id));
  }

  function updateSystem(id: string, field: string, value: unknown) {
    update(systems.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section D
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Proposed Information Systems</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define each new, enhanced, or replaced information system planned for this ISSP period.
            Projects are created in Part III-E.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{systems.length}</span>
          <span className="text-xs text-muted-foreground">Proposed Systems</span>
        </div>
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <span className={cn("text-2xl font-bold", s.value === "FOR_DEVELOPMENT" ? "text-blue-600" : "text-amber-600")}>
              {systems.filter((sys) => sys.status === s.value).length}
            </span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-xs text-green-800">
        <strong>Tip:</strong> Define your proposed systems here first, then go to Part III-E to create
        ICT projects that implement them. Each project can link back to one or more systems.
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Systems</h2>
          <Button variant="outline" size="sm" onClick={addSystem} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add System
          </Button>
        </div>

        {systems.length === 0 && (
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={addSystem}
          >
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No proposed systems yet.</p>
            <p className="text-xs text-primary hover:underline">Click to add the first system →</p>
          </div>
        )}

        {systems.map((sys, idx) => (
          <SystemCard
            key={sys.id}
            sys={sys}
            index={idx}
            isLinked={existingProjectIds.includes(sys.linkedProjectId)}
            isNew={newlyAddedIds.has(sys.id)}
            onUpdate={(field, value) => updateSystem(sys.id, field, value)}
            onRemove={() => removeSystem(sys.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<Link href="/editor/part3/c" />}>
          ← Proposed Human Capital
        </Button>
        <Button nativeButton={false} render={<Link href="/editor/part3/e1" />}>
          Next: Internal Projects →
        </Button>
      </div>
    </div>
  );
}
