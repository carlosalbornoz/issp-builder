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
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, ChevronDown, ChevronRight, Server } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/editor/section-shell";
import { YesNoToggle } from "@/components/issp-editor/yes-no-toggle";
import { AddItemDialog, useAddItemDraft } from "@/components/issp-editor/add-item-dialog";
import { revealNewItem } from "@/lib/reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

type IsClassification = "SUPPORT_TO_OPERATIONS" | "GENERAL_ADMIN" | "OPERATIONS" | "";
type PiaProcessAnswer = "yes" | "no" | "";

interface InformationSystem {
  id: string;
  name: string;
  classification: IsClassification;
  frontline: boolean;
  deploymentType: "HOSTED" | "CLOUD" | "HYBRID" | "ON_PREMISE" | "";
  url: string;
  description: string;
  developmentStrategy: "IN_HOUSE" | "OUTSOURCED" | "HYBRID" | "COTS" | "OPEN_SOURCE" | "";
  developmentPlatform: string;
  databaseName: string;
  dataStorage: "ON_PREMISE" | "CLOUD" | "HYBRID" | "";
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
    piaCompleted: boolean;
  };
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_IS: Omit<InformationSystem, "id"> = {
  name: "",
  classification: "",
  frontline: false,
  deploymentType: "",
  url: "",
  description: "",
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
  pia: {
    processesPersonalInfo: "",
    piaCompleted: false,
  },
};

// ─── Field config ─────────────────────────────────────────────────────────────

// Template taxonomy per DICT 2026 guidelines — labels must match the PDF renderer
const CLASSIFICATION_OPTIONS = [
  { value: "SUPPORT_TO_OPERATIONS", label: "Support to Operations" },
  { value: "GENERAL_ADMIN", label: "General Administrative Systems" },
  { value: "OPERATIONS", label: "Operations" },
];

const CLASSIFICATION_BADGES: Record<string, string> = {
  SUPPORT_TO_OPERATIONS: "Support to Ops",
  GENERAL_ADMIN: "Gen. Admin",
  OPERATIONS: "Operations",
};

const DEPLOYMENT_OPTIONS = [
  { value: "ON_PREMISE", label: "On-Premise" },
  { value: "CLOUD", label: "Cloud-Hosted" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "HOSTED", label: "Hosted (3rd Party)" },
];

const STRATEGY_OPTIONS = [
  { value: "IN_HOUSE", label: "In-House Development" },
  { value: "OUTSOURCED", label: "Outsourced" },
  { value: "HYBRID", label: "Hybrid (In-house + Outsourced)" },
  { value: "COTS", label: "Commercial Off-The-Shelf (COTS)" },
  { value: "OPEN_SOURCE", label: "Open Source" },
];

const STORAGE_OPTIONS = [
  { value: "ON_PREMISE", label: "On-Premise" },
  { value: "CLOUD", label: "Cloud" },
  { value: "HYBRID", label: "Hybrid" },
];

const CLASSIFICATION_COLORS: Record<string, string> = {
  SUPPORT_TO_OPERATIONS: "bg-info-bg text-info border border-info-border",
  GENERAL_ADMIN: "bg-muted text-muted-foreground border border-border",
  OPERATIONS: "bg-success-bg text-success border border-success-border",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ISCard({
  sys,
  index,
  initiallyExpanded = false,
  onUpdate,
  onRemove,
}: {
  sys: InformationSystem;
  index: number;
  initiallyExpanded?: boolean;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  function updateInterop(field: string, value: unknown) {
    onUpdate("interoperability", { ...sys.interoperability, [field]: value });
  }

  function updatePia(field: string, value: unknown) {
    onUpdate("pia", { ...sys.pia, [field]: value });
  }

  function setPiaProcessAnswer(value: PiaProcessAnswer) {
    onUpdate("pia", {
      ...sys.pia,
      processesPersonalInfo: value,
      piaCompleted: value === "yes" ? sys.pia.piaCompleted : false,
    });
  }

  return (
    <div data-reveal-id={sys.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Server className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">IS #{index + 1}</span>
            {sys.classification && (
              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", CLASSIFICATION_COLORS[sys.classification] ?? "bg-muted")}>
                {CLASSIFICATION_BADGES[sys.classification] ?? sys.classification}
              </span>
            )}
            {sys.frontline && (
              <Badge variant="secondary" className="text-xs h-5">Frontline</Badge>
            )}
          </div>
          <p className="text-sm font-medium line-clamp-2 break-words mt-0.5">
            {sys.name || <span className="text-muted-foreground italic">Unnamed System</span>}
          </p>
        </div>
        <ConfirmDeleteButton
          ariaLabel="Remove information system"
          confirmText="Delete this system?"
          onDelete={onRemove}
        />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Always-visible quick fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
        <FormField label="System Name" className="sm:col-span-2">
          <Input
            placeholder="e.g., Human Resource Information System"
            value={sys.name}
            onChange={(e) => onUpdate("name", e.target.value)}
          />
        </FormField>
        <FormField label="Classification">
          <Select
            items={CLASSIFICATION_OPTIONS}
            value={sys.classification}
            onValueChange={(v: string | null) => v && onUpdate("classification", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {CLASSIFICATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {sys.classification === "OPERATIONS" && (
          <FormField label="Operations Type">
            <div className="flex items-center gap-2 h-8">
              <Checkbox
                id={`frontline-${sys.id}`}
                checked={sys.frontline}
                onCheckedChange={(v) => onUpdate("frontline", v === true)}
              />
              <label htmlFor={`frontline-${sys.id}`} className="text-sm cursor-pointer">
                Frontline service <span className="text-muted-foreground">(unchecked = non-frontline)</span>
              </label>
            </div>
          </FormField>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="System URL / Portal" className="sm:col-span-2">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  value={sys.url}
                  onChange={(e) => onUpdate("url", e.target.value)}
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <Textarea
                  placeholder="Briefly describe the system's purpose and scope..."
                  value={sys.description}
                  onChange={(e) => onUpdate("description", e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </FormField>
              <FormField label="System Owner / Custodian">
                <Input
                  placeholder="e.g., HRMS Division"
                  value={sys.owner}
                  onChange={(e) => onUpdate("owner", e.target.value)}
                />
              </FormField>
              <FormField label="Deployment Type">
                <Select
                  items={DEPLOYMENT_OPTIONS}
                  value={sys.deploymentType}
                  onValueChange={(v: string | null) => v && onUpdate("deploymentType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPLOYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Technical Details */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Technical Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Development Strategy">
                <Select
                  items={STRATEGY_OPTIONS}
                  value={sys.developmentStrategy}
                  onValueChange={(v: string | null) => v && onUpdate("developmentStrategy", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Platform / Framework">
                <Input
                  placeholder="e.g., React, Laravel, Java"
                  value={sys.developmentPlatform}
                  onChange={(e) => onUpdate("developmentPlatform", e.target.value)}
                />
              </FormField>
              <FormField label="Database">
                <Input
                  placeholder="e.g., PostgreSQL, MySQL, Oracle"
                  value={sys.databaseName}
                  onChange={(e) => onUpdate("databaseName", e.target.value)}
                />
              </FormField>
              <FormField label="Data Storage Location">
                <Select
                  items={STORAGE_OPTIONS}
                  value={sys.dataStorage}
                  onValueChange={(v: string | null) => v && onUpdate("dataStorage", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Internal Users (units with access)">
                <Input
                  placeholder="e.g., HR Division, Finance Division"
                  value={sys.internalUsers}
                  onChange={(e) => onUpdate("internalUsers", e.target.value)}
                />
              </FormField>
              <FormField label="External Users (orgs with access)">
                <Input
                  placeholder="e.g., GSIS, PhilGEPS, general public"
                  value={sys.externalUsers}
                  onChange={(e) => onUpdate("externalUsers", e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* Interoperability */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Interoperability
            </h4>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: "integrated", label: "Integrated with other systems" },
                  { key: "generatesData", label: "Generates data for other systems" },
                  { key: "processesExternalData", label: "Processes data from external systems" },
                  { key: "sharedPlatform", label: "Uses a shared government platform" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={!!(sys.interoperability as Record<string, unknown>)[item.key]}
                      onCheckedChange={(v) => updateInterop(item.key, v === true)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
              {sys.interoperability.integrated && (
                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                  <FormField label="Internal Systems Integrated">
                    <Input
                      placeholder="e.g., HRIS, Payroll"
                      value={sys.interoperability.internalSystems}
                      onChange={(e) => updateInterop("internalSystems", e.target.value)}
                    />
                  </FormField>
                  <FormField label="External Systems Integrated">
                    <Input
                      placeholder="e.g., PhilSys, SSS API"
                      value={sys.interoperability.externalSystems}
                      onChange={(e) => updateInterop("externalSystems", e.target.value)}
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Impact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Privacy Impact Assessment (PIA)
            </h4>
            <div className="space-y-3">
              <YesNoToggle
                question="Processes personal / sensitive personal information?"
                value={sys.pia.processesPersonalInfo}
                onChange={setPiaProcessAnswer}
              />
              {sys.pia.processesPersonalInfo === "yes" && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={sys.pia.piaCompleted}
                    onCheckedChange={(v) => updatePia("piaCompleted", v === true)}
                  />
                  <span className="text-sm">PIA has been conducted and completed</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part2CForm({
  initialData,
}: {
  initialData: InformationSystem[];
}) {
  const [systems, setSystems] = useState<InformationSystem[]>(initialData);

  const { debouncedSave } = useLocalSave("part2", "part2/c");

  const update = useCallback(
    (next: InformationSystem[]) => {
      setSystems(next);
      debouncedSave({ informationSystems: next });
    },
    [debouncedSave]
  );

  const addDialog = useAddItemDraft();
  // ids created this session — their cards mount expanded
  const [freshIds] = useState(() => new Set<string>());

  function createSystem() {
    const sys = { id: generateId(), ...DEFAULT_IS, name: addDialog.draft.trim() };
    freshIds.add(sys.id);
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

  const frontlineCount = systems.filter((s) => s.frontline).length;

  return (
    <SectionShell
      sectionId="part2/c"
      title="IS Inventory"
      description="Enumerate all existing information systems maintained or used by the agency."
    >

      {/* One-release migration notice (2026-06: G2C/G2B/etc → official template taxonomy) */}
      <div className="rounded-lg border border-info-border bg-info-bg px-4 py-2 text-xs text-info">
        Classifications now use the official template taxonomy (Support to Operations / General
        Administrative Systems / Operations). Previously saved systems were remapped automatically —
        please review each system&apos;s classification.
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{systems.length}</span>
          <span className="text-xs text-muted-foreground">Total Systems</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-success">{frontlineCount}</span>
          <span className="text-xs text-muted-foreground">Frontline Services</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-warning">
            {systems.filter((s) => s.pia.processesPersonalInfo === "yes").length}
          </span>
          <span className="text-xs text-muted-foreground">With Personal Data</span>
        </div>
      </div>

      {/* System cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Information Systems</h2>
          <Button variant="outline" size="sm" onClick={addDialog.openDialog} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add System
          </Button>
        </div>

        {systems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No systems added yet.</p>
              <Button variant="outline" onClick={addDialog.openDialog} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add the first IS
              </Button>
            </CardContent>
          </Card>
        )}

        {systems.map((sys, idx) => (
          <ISCard
            key={sys.id}
            sys={sys}
            index={idx}
            initiallyExpanded={freshIds.has(sys.id)}
            onUpdate={(field, value) => updateSystem(sys.id, field, value)}
            onRemove={() => removeSystem(sys.id)}
          />
        ))}
      </div>

      <AddItemDialog
        open={addDialog.open}
        onOpenChange={addDialog.setOpen}
        title="Add Information System"
        description="Name the system first — the full inventory card opens right after, ready to fill in."
        createLabel="Add system"
        canCreate={addDialog.draft.trim().length > 0}
        onCreate={createSystem}
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-is-name" className="text-sm">System Name</Label>
          <Input
            id="new-is-name"
            autoFocus
            placeholder="e.g., Human Resource Information System"
            value={addDialog.draft}
            onChange={(e) => addDialog.setDraft(e.target.value)}
          />
        </div>
      </AddItemDialog>
    </SectionShell>
  );
}
