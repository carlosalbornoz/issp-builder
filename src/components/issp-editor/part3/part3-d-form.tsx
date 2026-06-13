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
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, ChevronDown, ChevronRight, Sparkles, Link2, Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/editor/section-shell";
import { YesNoToggle } from "@/components/issp-editor/yes-no-toggle";
import { AddItemDialog, useAddItemDraft } from "@/components/issp-editor/add-item-dialog";
import { revealNewItem } from "@/lib/reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PiaProcessAnswer = "yes" | "no" | "";

export interface ProposedSystem {
  id: string;
  name: string;
  classification: "SUPPORT_TO_OPERATIONS" | "GENERAL_ADMIN" | "OPERATIONS" | "";
  frontline: boolean;
  deploymentType: string;
  description: string;
  status: "FOR_DEVELOPMENT" | "FOR_ENHANCEMENT" | "";
  enhancementDetails: string;
  developmentStrategy: string;
  developmentPlatform: string;
  databaseName: string;
  dataStorage: string;
  internalUsers: string;
  externalUsers: string;
  owner: string;
  interoperability: {
    integrated: boolean;
    internalSystems: string;
    externalSystems: string;
    generatesData: boolean;
    processesExternalData: boolean;
    sharedPlatform: boolean;
  };
  pia: {
    processesPersonalInfo: PiaProcessAnswer;
    piaRequired: boolean;
  };
}

function generateId() {
  return `ps-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_SYSTEM: Omit<ProposedSystem, "id"> = {
  name: "",
  classification: "",
  frontline: false,
  deploymentType: "",
  description: "",
  status: "",
  enhancementDetails: "",
  developmentStrategy: "",
  developmentPlatform: "",
  databaseName: "",
  dataStorage: "",
  internalUsers: "",
  externalUsers: "",
  owner: "",
  interoperability: {
    integrated: false,
    internalSystems: "",
    externalSystems: "",
    generatesData: false,
    processesExternalData: false,
    sharedPlatform: false,
  },
  pia: { processesPersonalInfo: "", piaRequired: false },
};

// Template taxonomy per DICT 2026 guidelines — labels must match the PDF renderer
const CLASSIFICATION_OPTIONS = [
  { value: "SUPPORT_TO_OPERATIONS", label: "Support to Operations" },
  { value: "GENERAL_ADMIN", label: "General Administrative Systems" },
  { value: "OPERATIONS", label: "Operations" },
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
  { value: "FOR_DEVELOPMENT", label: "For Development", color: "bg-info-bg text-info border border-info-border" },
  { value: "FOR_ENHANCEMENT", label: "For Enhancement", color: "bg-warning-bg text-warning border border-warning-border" },
];

const STATUS_COLOR: Record<string, string> = {
  FOR_DEVELOPMENT: "bg-info-bg text-info border border-info-border",
  FOR_ENHANCEMENT: "bg-warning-bg text-warning border border-warning-border",
};

const INTEROP_ITEMS = [
  { key: "integrated", label: "Integrated with other systems" },
  { key: "generatesData", label: "Generates data for other systems" },
  { key: "processesExternalData", label: "Processes data from external systems" },
  { key: "sharedPlatform", label: "Uses a shared government platform" },
] as const;

const labelOf = (opts: { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;

// ─── System Card ──────────────────────────────────────────────────────────────

function SystemCard({
  sys,
  index,
  linkedProjectTitles,
  isNew,
  onUpdate,
  onRemove,
}: {
  sys: ProposedSystem;
  index: number;
  /** Titles of Part III-E projects that link this system (cross-reference, named per principle 4). */
  linkedProjectTitles: string[];
  isNew: boolean;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const isLinked = linkedProjectTitles.length > 0;
  // Existing systems open collapsed→read; new ones mount expanded in edit (principle 2).
  const [expanded, setExpanded] = useState(isNew);
  const [editing, setEditing] = useState(isNew);

  function updateInterop(field: string, value: unknown) {
    onUpdate("interoperability", { ...sys.interoperability, [field]: value });
  }

  function setPiaProcessAnswer(value: PiaProcessAnswer) {
    onUpdate("pia", {
      ...sys.pia,
      processesPersonalInfo: value,
      piaRequired: value === "yes" ? sys.pia.piaRequired : false,
    });
  }

  return (
    <div data-reveal-id={sys.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
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
              <span
                className="flex items-center gap-1 text-xs text-success bg-success-bg px-1.5 py-0.5 rounded border border-success-border max-w-56"
                title={`Linked from: ${linkedProjectTitles.join(", ")}`}
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  In: {linkedProjectTitles[0] || "Untitled project"}
                  {linkedProjectTitles.length > 1 ? ` +${linkedProjectTitles.length - 1}` : ""}
                </span>
              </span>
            )}
          </div>
          <p className="text-sm font-medium line-clamp-2 break-words mt-0.5">
            {sys.name || <span className="text-muted-foreground italic">Unnamed System</span>}
          </p>
        </div>
        <ConfirmDeleteButton
          ariaLabel="Remove proposed system"
          confirmText="Delete this system?"
          onDelete={onRemove}
        />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Read view (principle 2: read and edit are different modes) */}
      {expanded && !editing && <SystemReadView sys={sys} onEdit={() => setEditing(true)} />}

      {/* Expanded details (edit mode) */}
      {expanded && editing && (
        <div className="p-4 space-y-6">
          {/* Identity — name, status & classification live here, not duplicated in the header row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description & Purpose</Label>
            <Textarea
              placeholder="Describe salient features, functions, and reports the system will generate."
              value={sys.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

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
            {sys.classification === "OPERATIONS" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operations Type</Label>
                <label className="flex items-center gap-2 h-8 cursor-pointer">
                  <Checkbox
                    checked={sys.frontline}
                    onCheckedChange={(v) => onUpdate("frontline", v === true)}
                  />
                  <span className="text-sm">Frontline service</span>
                </label>
              </div>
            )}
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
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Internal Users (units)</Label>
              <Input
                placeholder="e.g., HR Division, Finance"
                value={sys.internalUsers}
                onChange={(e) => onUpdate("internalUsers", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">External Users (orgs)</Label>
              <Input
                placeholder="e.g., GSIS, general public"
                value={sys.externalUsers}
                onChange={(e) => onUpdate("externalUsers", e.target.value)}
              />
            </div>
          </div>

          {/* Interoperability */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interoperability</Label>
            <div className="grid sm:grid-cols-2 gap-3">
              {INTEROP_ITEMS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!(sys.interoperability as Record<string, unknown>)[item.key]}
                    onCheckedChange={(v) => updateInterop(item.key, v === true)}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
            {sys.interoperability.integrated && (
              <div className="grid sm:grid-cols-2 gap-3 pl-6">
                <Input
                  placeholder="Internal systems…"
                  value={sys.interoperability.internalSystems}
                  onChange={(e) => updateInterop("internalSystems", e.target.value)}
                />
                <Input
                  placeholder="External systems…"
                  value={sys.interoperability.externalSystems}
                  onChange={(e) => updateInterop("externalSystems", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* PIA */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Privacy</Label>
            <div className="space-y-3">
              <YesNoToggle
                question="Will process personal information?"
                value={sys.pia.processesPersonalInfo}
                onChange={setPiaProcessAnswer}
              />
              {sys.pia.processesPersonalInfo === "yes" && (
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

          <div className="flex justify-end border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Done editing
            </Button>
          </div>
        </div>
      )}

      {/* Auto-prompt: nudge user to create an ICT project for this new system */}
      {isNew && !isLinked && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-info-bg border-t border-info-border">
          <div className="flex items-center gap-2 text-xs text-info">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span>Ready to plan implementation? Create an ICT project for this system in Part III-E.</span>
          </div>
          <Link
            href="/editor/part3/e1"
            className="shrink-0 text-xs text-info hover:opacity-80 hover:bg-info-border h-7 px-2 inline-flex items-center rounded-md"
          >
            Go to Part III-E →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Read-only presentation of a system (principle 2) ─────────────────────────

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === "" || value === null || value === undefined;
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <span className="text-xs text-muted-foreground uppercase tracking-wide pt-0.5">{label}</span>
      <div className="min-w-0 whitespace-pre-wrap break-words">
        {empty ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}

function SystemReadView({ sys, onEdit }: { sys: ProposedSystem; onEdit: () => void }) {
  const interop = INTEROP_ITEMS.filter(
    (item) => (sys.interoperability as Record<string, unknown>)[item.key]
  ).map((item) => item.label);

  return (
    <div className="p-4 space-y-3">
      <ReadRow label="Description" value={sys.description} />
      {sys.status === "FOR_ENHANCEMENT" && (
        <ReadRow label="Enhancement" value={sys.enhancementDetails} />
      )}
      {sys.classification === "OPERATIONS" && (
        <ReadRow label="Operations Type" value={sys.frontline ? "Frontline service" : "Non-frontline"} />
      )}
      <ReadRow label="Deployment" value={sys.deploymentType ? labelOf(DEPLOYMENT_OPTIONS, sys.deploymentType) : ""} />
      <ReadRow label="Owner" value={sys.owner} />
      <ReadRow label="Dev Strategy" value={sys.developmentStrategy ? labelOf(STRATEGY_OPTIONS, sys.developmentStrategy) : ""} />
      <ReadRow label="Platform" value={sys.developmentPlatform} />
      <ReadRow label="Database" value={sys.databaseName} />
      <ReadRow label="Data Storage" value={sys.dataStorage ? labelOf(STORAGE_OPTIONS, sys.dataStorage) : ""} />
      <ReadRow label="Internal Users" value={sys.internalUsers} />
      <ReadRow label="External Users" value={sys.externalUsers} />
      <ReadRow
        label="Interoperability"
        value={
          interop.length
            ? [
                interop.join(", "),
                sys.interoperability.integrated && sys.interoperability.internalSystems
                  ? `Internal: ${sys.interoperability.internalSystems}`
                  : "",
                sys.interoperability.integrated && sys.interoperability.externalSystems
                  ? `External: ${sys.interoperability.externalSystems}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n")
            : ""
        }
      />
      <ReadRow
        label="Personal Data"
        value={
          sys.pia.processesPersonalInfo === "yes"
            ? `Yes — PIA ${sys.pia.piaRequired ? "will be conducted" : "not yet flagged"}`
            : sys.pia.processesPersonalInfo === "no"
              ? "No"
              : ""
        }
      />
      <div className="flex justify-end border-t pt-3">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit system
        </Button>
      </div>
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part3DForm({
  initialSystems,
  linkingProjects,
}: {
  initialSystems: ProposedSystem[];
  /** Part III-E projects (both lists) — used to name which project links each system. */
  linkingProjects: { id: string; title: string; linkedSystemIds: string[] }[];
}) {
  const [systems, setSystems] = useState<ProposedSystem[]>(initialSystems);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const { debouncedSave } = useLocalSave("part3", "part3/d");

  const update = useCallback(
    (next: ProposedSystem[]) => {
      setSystems(next);
      debouncedSave({ proposedSystems: next });
    },
    [debouncedSave]
  );

  const addDialog = useAddItemDraft();

  function createSystem() {
    const sys = { id: generateId(), ...DEFAULT_SYSTEM, name: addDialog.draft.trim() };
    setNewlyAddedIds((prev) => new Set(prev).add(sys.id));
    update([...systems, sys]);
    addDialog.setOpen(false);
    revealNewItem(sys.id);
  }

  function removeSystem(id: string) {
    update(systems.filter((s) => s.id !== id));
  }

  function updateSystem(id: string, field: string, value: unknown) {
    update(systems.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  return (
    <SectionShell
      sectionId="part3/d"
      title="Proposed Information Systems"
      description="Define the proposed information systems to be developed, acquired, or enhanced. Projects are created in Part III-E."
    >

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{systems.length}</span>
          <span className="text-xs text-muted-foreground">Proposed Systems</span>
        </div>
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <span className={cn("text-2xl font-bold", s.value === "FOR_DEVELOPMENT" ? "text-info" : "text-warning")}>
              {systems.filter((sys) => sys.status === s.value).length}
            </span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="rounded-lg border border-success-border bg-success-bg p-3 text-xs text-success">
        <strong>Tip:</strong> Define your proposed systems here first, then go to Part III-E to create
        ICT projects that implement them. Each project can link back to one or more systems.
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Systems</h2>
          <Button variant="outline" size="sm" onClick={addDialog.openDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add System
          </Button>
        </div>

        {systems.length === 0 && (
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={addDialog.openDialog}
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
            linkedProjectTitles={linkingProjects
              .filter((proj) => (proj.linkedSystemIds ?? []).includes(sys.id))
              .map((proj) => proj.title)}
            isNew={newlyAddedIds.has(sys.id)}
            onUpdate={(field, value) => updateSystem(sys.id, field, value)}
            onRemove={() => removeSystem(sys.id)}
          />
        ))}
      </div>

      <AddItemDialog
        open={addDialog.open}
        onOpenChange={addDialog.setOpen}
        title="Add Proposed Information System"
        description="Name the system first — the full card opens right after, ready to fill in."
        createLabel="Add system"
        canCreate={addDialog.draft.trim().length > 0}
        onCreate={createSystem}
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-ps-name" className="text-sm">System Name</Label>
          <Input
            id="new-ps-name"
            autoFocus
            placeholder="e.g., Citizen Feedback Portal"
            value={addDialog.draft}
            onChange={(e) => addDialog.setDraft(e.target.value)}
          />
        </div>
      </AddItemDialog>
    </SectionShell>
  );
}
