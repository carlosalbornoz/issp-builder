"use client";

import { useRouter } from "next/navigation";
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
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, ChevronDown, ChevronRight, Server } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InformationSystem {
  id: string;
  name: string;
  classification: "G2C" | "G2B" | "G2G" | "G2E" | "INTERNAL" | "";
  frontline: boolean;
  deploymentType: "HOSTED" | "CLOUD" | "HYBRID" | "ON_PREMISE" | "";
  url: string;
  description: string;
  developmentStrategy: "IN_HOUSE" | "OUTSOURCED" | "HYBRID" | "COTS" | "OPEN_SOURCE" | "";
  developmentPlatform: string;
  databaseName: string;
  dataStorage: "ON_PREMISE" | "CLOUD" | "HYBRID" | "";
  internalUsers: number;
  externalUsers: number;
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
    processesPersonalInfo: boolean;
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
  internalUsers: 0,
  externalUsers: 0,
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
    processesPersonalInfo: false,
    piaCompleted: false,
  },
};

// ─── Field config ─────────────────────────────────────────────────────────────

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
  G2C: "bg-blue-100 text-blue-800",
  G2B: "bg-green-100 text-green-800",
  G2G: "bg-purple-100 text-purple-800",
  G2E: "bg-amber-100 text-amber-800",
  INTERNAL: "bg-gray-100 text-gray-800",
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
  onUpdate,
  onRemove,
}: {
  sys: InformationSystem;
  index: number;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function updateInterop(field: string, value: unknown) {
    onUpdate("interoperability", { ...sys.interoperability, [field]: value });
  }

  function updatePia(field: string, value: unknown) {
    onUpdate("pia", { ...sys.pia, [field]: value });
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
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
                {sys.classification}
              </span>
            )}
            {sys.frontline && (
              <Badge variant="secondary" className="text-xs h-5">Frontline</Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-0.5">
            {sys.name || <span className="text-muted-foreground italic">Unnamed System</span>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove information system"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
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
        <FormField label="Frontline Service?">
          <div className="flex items-center gap-2 h-8">
            <Checkbox
              id={`frontline-${sys.id}`}
              checked={sys.frontline}
              onCheckedChange={(v) => onUpdate("frontline", v === true)}
            />
            <label htmlFor={`frontline-${sys.id}`} className="text-sm cursor-pointer">
              Yes, this is a frontline service
            </label>
          </div>
        </FormField>
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
              <FormField label="Internal Users">
                <Input
                  type="number"
                  min={0}
                  value={sys.internalUsers}
                  onChange={(e) => onUpdate("internalUsers", Number(e.target.value))}
                />
              </FormField>
              <FormField label="External / Public Users">
                <Input
                  type="number"
                  min={0}
                  value={sys.externalUsers}
                  onChange={(e) => onUpdate("externalUsers", Number(e.target.value))}
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
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={sys.pia.processesPersonalInfo}
                  onCheckedChange={(v) => updatePia("processesPersonalInfo", v === true)}
                />
                <span className="text-sm">Processes personal / sensitive personal information</span>
              </label>
              {sys.pia.processesPersonalInfo && (
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
  const router = useRouter();
  const [systems, setSystems] = useState<InformationSystem[]>(initialData);

  const { status, debouncedSave } = useLocalSave("part2");

  const update = useCallback(
    (next: InformationSystem[]) => {
      setSystems(next);
      debouncedSave({ informationSystems: next });
    },
    [debouncedSave]
  );

  function addSystem() {
    update([...systems, { id: generateId(), ...DEFAULT_IS }]);
  }

  function removeSystem(id: string) {
    update(systems.filter((s) => s.id !== id));
  }

  function updateSystem(id: string, field: string, value: unknown) {
    update(systems.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  const frontlineCount = systems.filter((s) => s.frontline).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
            Part II · Section C
          </p>
          <h1 className="text-2xl font-bold tracking-tight">IS Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enumerate all existing information systems maintained or used by the agency.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-primary">{systems.length}</span>
          <span className="text-xs text-muted-foreground">Total Systems</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-green-600">{frontlineCount}</span>
          <span className="text-xs text-muted-foreground">Frontline Services</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-2xl font-bold text-amber-600">
            {systems.filter((s) => s.pia.processesPersonalInfo).length}
          </span>
          <span className="text-xs text-muted-foreground">With Personal Data</span>
        </div>
      </div>

      {/* System cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Information Systems</h2>
          <Button variant="outline" size="sm" onClick={addSystem} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add System
          </Button>
        </div>

        {systems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No systems added yet.</p>
              <Button variant="outline" onClick={addSystem} className="gap-1.5">
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
            onUpdate={(field, value) => updateSystem(sys.id, field, value)}
            onRemove={() => removeSystem(sys.id)}
          />
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/editor/part2/b")}
        >
          ← Network &amp; Cybersecurity
        </Button>
        <Button onClick={() => router.push("/editor/part2/d")}>
          Next: E-Gov Programs →
        </Button>
      </div>
    </div>
  );
}
