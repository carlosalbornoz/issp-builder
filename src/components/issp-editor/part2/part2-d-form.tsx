"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalSave } from "@/hooks/use-local-save";
import { CheckCircle2, XCircle, MinusCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "utilizing" | "proposed" | "not_applicable" | "not_utilizing";

interface EgpProgram {
  status: Status;
  url?: string;
  equivalentName?: string;
  notes?: string;
}

interface EgpChecklist {
  elgu?: EgpProgram;            // LGU only
  eGovPay: EgpProgram;
  pnpki: EgpProgram & { adoptionPercentage?: number };
  hcmis: EgpProgram;
  ifmis: EgpProgram;
  onlinePortal: EgpProgram & { channels?: string };
  procurement: EgpProgram;
  recordsMgmt: EgpProgram;
  pscp: EgpProgram;
}

const DEFAULT_PROGRAM: EgpProgram = { status: "not_utilizing" };

const DEFAULT_CHECKLIST: EgpChecklist = {
  eGovPay: { ...DEFAULT_PROGRAM },
  pnpki: { ...DEFAULT_PROGRAM },
  hcmis: { ...DEFAULT_PROGRAM },
  ifmis: { ...DEFAULT_PROGRAM },
  onlinePortal: { ...DEFAULT_PROGRAM },
  procurement: { ...DEFAULT_PROGRAM },
  recordsMgmt: { ...DEFAULT_PROGRAM },
  pscp: { ...DEFAULT_PROGRAM },
};

type AgencyType = "NGA" | "GOCC" | "LGU" | "OTHER";

// ─── Status options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: Status; label: string; icon: React.ComponentType<{ className?: string }>; className: string }[] = [
  { value: "utilizing", label: "Utilizing", icon: CheckCircle2, className: "text-green-600" },
  { value: "proposed", label: "Proposed / In Progress", icon: AlertCircle, className: "text-amber-600" },
  { value: "not_utilizing", label: "Not Utilizing", icon: XCircle, className: "text-red-500" },
  { value: "not_applicable", label: "Not Applicable", icon: MinusCircle, className: "text-muted-foreground" },
];

function getStatusConfig(status: Status) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[2];
}

// ─── EGP programs config ───────────────────────────────────────────────────────

type ProgramKey = keyof EgpChecklist;

interface ProgramConfig {
  key: ProgramKey;
  label: string;
  description: string;
  lguOnly?: boolean;
  showUrl?: boolean;
  showEquivalent?: boolean;
  showNotes?: boolean;
  showChannels?: boolean;
  showAdoptionPercent?: boolean;
}

const PROGRAMS: ProgramConfig[] = [
  {
    key: "elgu",
    label: "eLGU",
    description: "Integrated local government operations management system for LGUs.",
    lguOnly: true,
    showUrl: true,
    showEquivalent: true,
  },
  {
    key: "eGovPay",
    label: "eGovPay",
    description: "Government payment gateway for online and over-the-counter payments.",
    showUrl: true,
    showNotes: true,
  },
  {
    key: "pnpki",
    label: "Philippine National Public Key Infrastructure (PNPKI)",
    description: "Digital certificate infrastructure for secure government communications.",
    showAdoptionPercent: true,
    showNotes: true,
  },
  {
    key: "hcmis",
    label: "Human Capital Management Information System (HCMIS)",
    description: "Centralized HRMS platform for government agencies.",
    showEquivalent: true,
    showNotes: true,
  },
  {
    key: "ifmis",
    label: "Integrated Financial Management Information System (IFMIS)",
    description: "Government financial management system.",
    showEquivalent: true,
    showNotes: true,
  },
  {
    key: "onlinePortal",
    label: "Online Services / Citizen Portal",
    description: "Agency's online portal for citizen-facing services.",
    showUrl: true,
    showChannels: true,
    showEquivalent: true,
    showNotes: true,
  },
  {
    key: "procurement",
    label: "Philippine Government Electronic Procurement System (PhilGEPS)",
    description: "Government procurement transparency and management portal.",
    showUrl: true,
    showEquivalent: true,
  },
  {
    key: "recordsMgmt",
    label: "Electronic Records Management System",
    description: "System for managing official government records electronically.",
    showEquivalent: true,
    showNotes: true,
  },
  {
    key: "pscp",
    label: "Philippine Standard Chart of Accounts (PSCP) / Accounting System",
    description: "Government accounting and chart of accounts system.",
    showEquivalent: true,
  },
];

// ─── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({
  config,
  value,
  onChange,
}: {
  config: ProgramConfig;
  value: EgpProgram & { adoptionPercentage?: number; channels?: string };
  onChange: (updated: typeof value) => void;
}) {
  const statusCfg = getStatusConfig(value.status);
  const StatusIcon = statusCfg.icon;
  const isUtilizing = value.status === "utilizing";
  const isProposed = value.status === "proposed";
  const showDetails = isUtilizing || isProposed;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug">{config.label}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 gap-1 text-xs", statusCfg.className)}
          >
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status selector */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = value.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, status: opt.value })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Conditional detail fields */}
        {showDetails && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {config.showUrl && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">System URL</label>
                <Input
                  placeholder="https://..."
                  value={value.url ?? ""}
                  onChange={(e) => onChange({ ...value, url: e.target.value })}
                />
              </div>
            )}
            {config.showAdoptionPercent && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Adoption Percentage (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0–100"
                  value={value.adoptionPercentage ?? ""}
                  onChange={(e) =>
                    onChange({ ...value, adoptionPercentage: Number(e.target.value) })
                  }
                />
              </div>
            )}
            {config.showEquivalent && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Equivalent / Alternative System Name
                </label>
                <Input
                  placeholder="If using an equivalent system..."
                  value={value.equivalentName ?? ""}
                  onChange={(e) => onChange({ ...value, equivalentName: e.target.value })}
                />
              </div>
            )}
            {config.showChannels && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Service Channels Available
                </label>
                <Input
                  placeholder="e.g., Web portal, Mobile app, Email, Walk-in"
                  value={(value as { channels?: string }).channels ?? ""}
                  onChange={(e) =>
                    onChange({ ...value, channels: e.target.value } as typeof value)
                  }
                />
              </div>
            )}
            {config.showNotes && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Input
                  placeholder="Additional notes..."
                  value={value.notes ?? ""}
                  onChange={(e) => onChange({ ...value, notes: e.target.value })}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part2DForm({
  agencyType,
  initialData,
}: {
  agencyType: AgencyType;
  initialData: Partial<EgpChecklist>;
}) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<EgpChecklist>({
    ...DEFAULT_CHECKLIST,
    ...initialData,
  });

  const { debouncedSave } = useLocalSave("part2");

  const update = useCallback(
    (next: EgpChecklist) => {
      setChecklist(next);
      debouncedSave({ egpChecklist: next });
    },
    [debouncedSave]
  );

  function updateProgram(key: ProgramKey, value: EgpProgram & { adoptionPercentage?: number; channels?: string }) {
    update({ ...checklist, [key]: value });
  }

  const visiblePrograms = PROGRAMS.filter((p) => {
    if (p.lguOnly && agencyType !== "LGU") return false;
    return true;
  });

  const utilizingCount = visiblePrograms.filter((p) => {
    const val = checklist[p.key];
    return val?.status === "utilizing";
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
            Part II · Section D
          </p>
          <h1 className="text-2xl font-bold tracking-tight">E-Government Programs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Indicate adoption status for each government-mandated e-government program.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-xl font-bold text-green-600 leading-none">{utilizingCount}</p>
            <p className="text-xs text-muted-foreground">Utilizing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-xl font-bold text-amber-600 leading-none">
              {visiblePrograms.filter((p) => checklist[p.key]?.status === "proposed").length}
            </p>
            <p className="text-xs text-muted-foreground">Proposed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-xl font-bold text-red-500 leading-none">
              {visiblePrograms.filter((p) => checklist[p.key]?.status === "not_utilizing").length}
            </p>
            <p className="text-xs text-muted-foreground">Not Utilizing</p>
          </div>
        </div>
      </div>

      {agencyType === "LGU" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2 text-xs text-blue-700">
          <strong>LGU:</strong> The eLGU program section is visible because your agency type is set to LGU.
        </div>
      )}

      {/* Program cards */}
      <div className="grid gap-4">
        {visiblePrograms.map((config) => (
          <ProgramCard
            key={config.key}
            config={config}
            value={(checklist[config.key] ?? DEFAULT_PROGRAM) as EgpProgram & { adoptionPercentage?: number; channels?: string }}
            onChange={(val) => updateProgram(config.key, val)}
          />
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/editor/part2/c")}
        >
          ← IS Inventory
        </Button>
        <Button onClick={() => router.push("/editor/part3/a")}>
          Next: Part III - Proposed Strategy →
        </Button>
      </div>
    </div>
  );
}
