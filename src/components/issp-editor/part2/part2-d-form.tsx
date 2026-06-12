"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalSave } from "@/hooks/use-local-save";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, MinusCircle, AlertCircle, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/editor/section-shell";
import { YesNoToggle, type YesNoAnswer } from "@/components/issp-editor/yes-no-toggle";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "utilizing" | "proposed" | "not_applicable" | "not_utilizing" | "";

/** Template "If No" follow-up options (items 1, 2, 4, 5, 7). */
interface EgpIfNo {
  usingEquivalent?: boolean;
  manual?: boolean;
  proposedDevelopment?: boolean;
  otherPlatform?: boolean;
}

/** Template item 6: citizen assistance / feedback mechanism checkboxes. */
interface EgpPortalMechanisms {
  website: boolean;
  email: boolean;
  landline: boolean;
  socialMedia: boolean;
  mobile: boolean;
}

const DEFAULT_MECHANISMS: EgpPortalMechanisms = {
  website: false,
  email: false,
  landline: false,
  socialMedia: false,
  mobile: false,
};

interface EgpProgram {
  status: Status;
  url?: string;
  equivalentName?: string;
  equivalentUrl?: string;
  notes?: string;
  ifNo?: EgpIfNo;
}

interface EgpChecklist {
  elgu?: EgpProgram;            // LGU only
  eGovPay: EgpProgram;
  pnpki: EgpProgram & { adoptionPercentage?: number };
  hcmis: EgpProgram;
  ifmis: EgpProgram;
  onlinePortal: EgpProgram & {
    channels?: string; // legacy free text; superseded by mechanisms
    mechanisms?: EgpPortalMechanisms;
    connectedToPortal?: YesNoAnswer;
  };
  procurement: EgpProgram;
  recordsMgmt: EgpProgram;
  pscp: EgpProgram;
}

const DEFAULT_PROGRAM: EgpProgram = { status: "" };

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

const STATUS_OPTIONS: { value: Exclude<Status, "">; label: string; icon: React.ComponentType<{ className?: string }>; className: string }[] = [
  { value: "utilizing", label: "Utilizing", icon: CheckCircle2, className: "text-success" },
  { value: "proposed", label: "Proposed for adoption / In Progress", icon: AlertCircle, className: "text-warning" },
  { value: "not_utilizing", label: "Not Utilizing", icon: XCircle, className: "text-destructive" },
  { value: "not_applicable", label: "Not Applicable", icon: MinusCircle, className: "text-muted-foreground" },
];

function getStatusConfig(status: Status) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? null;
}

// ─── EGP programs config ───────────────────────────────────────────────────────

type ProgramKey = keyof EgpChecklist;

type IfNoOption = "equivalent" | "manual" | "proposedDev" | "otherPlatform";

interface ProgramConfig {
  key: ProgramKey;
  label: string;
  description: string;
  lguOnly?: boolean;
  showUrl?: boolean;
  /** Show the system-name input when Utilizing/Proposed (template "If Yes, indicate the system"). */
  showEquivalent?: boolean;
  equivalentLabel?: string;
  showNotes?: boolean;
  showAdoptionPercent?: boolean;
  /** Template "If No" follow-up checkboxes shown when status = Not Utilizing. */
  ifNoOptions?: IfNoOption[];
  manualLabel?: string;
  /** eLGU: the equivalent system needs a URL as well as a name. */
  equivalentUrlOnNo?: boolean;
  /** Item 6: feedback-mechanism checkboxes + connected-to-portal question. */
  portalMechanisms?: boolean;
}

const PROGRAMS: ProgramConfig[] = [
  {
    key: "elgu",
    label: "eLGU",
    description: "Integrated local government operations management system for LGUs.",
    lguOnly: true,
    showUrl: true,
    ifNoOptions: ["equivalent", "manual"],
    manualLabel: "Manual Transaction",
    equivalentUrlOnNo: true,
  },
  {
    key: "eGovPay",
    label: "eGovPay",
    description: "Government payment gateway for online and over-the-counter payments.",
    showUrl: true,
    showNotes: true,
    ifNoOptions: ["otherPlatform", "manual", "proposedDev"],
    manualLabel: "Manual Transaction",
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
    showNotes: true,
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "ifmis",
    label: "Integrated Financial Management Information System (IFMIS)",
    description: "Government financial management system.",
    showNotes: true,
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "onlinePortal",
    label: "Online Public Service Portal",
    description:
      "Consumer protection and citizen assistance, feedback and grievance mechanisms, and their connection to online public service portals.",
    showUrl: true,
    showNotes: true,
    portalMechanisms: true,
  },
  {
    key: "procurement",
    label: "Philippine Government Procurement System (PhilGEPS)",
    description: "Government procurement transparency and management portal.",
    showUrl: true,
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "recordsMgmt",
    label: "Records and Knowledge Management Information System",
    description: "Repository for records and knowledge management in the agency.",
    showEquivalent: true,
    equivalentLabel: "Indicate the system",
    showNotes: true,
  },
  {
    key: "pscp",
    label: "Public Service Continuity Plan (PSCP)",
    description:
      "Documented plan to ensure continued delivery of public services during disruptions and emergencies.",
  },
];

// ─── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({
  config,
  value,
  onChange,
}: {
  config: ProgramConfig;
  value: EgpProgram & { adoptionPercentage?: number; channels?: string; mechanisms?: EgpPortalMechanisms; connectedToPortal?: YesNoAnswer };
  onChange: (updated: typeof value) => void;
}) {
  const statusCfg = getStatusConfig(value.status);
  const StatusIcon = statusCfg?.icon;
  const isUtilizing = value.status === "utilizing";
  const isProposed = value.status === "proposed";
  const showDetails = isUtilizing || isProposed;
  const isUnanswered = !value.status;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isUnanswered && "border-warning-border bg-warning-bg/20 ring-1 ring-warning-border"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug">{config.label}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
          </div>
          {statusCfg && StatusIcon ? (
            <Badge
              variant="outline"
              className={cn("shrink-0 gap-1 text-xs", statusCfg.className)}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </Badge>
          ) : (
            <span className="shrink-0 rounded-md border border-warning-border bg-warning-bg px-2 py-1 text-xs font-medium text-warning">
              Needs answer
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUnanswered && (
          <p className="text-xs font-medium text-warning">
            Select one status below to complete this checklist item.
          </p>
        )}
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

        {/* Adoption % — the template asks this unconditionally (no status gate) */}
        {config.showAdoptionPercent && (
          <div className="space-y-1.5 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground">
              Adoption Percentage (%) — employees with active PNPKI certificates over total employees
            </label>
            <NumberInput
              min={0}
              max={100}
              placeholder="0–100"
              value={value.adoptionPercentage ?? 0}
              onValueChange={(n) => onChange({ ...value, adoptionPercentage: n })}
            />
          </div>
        )}

        {/* Item 6 — feedback mechanisms + portal connection (unconditional per template) */}
        {config.portalMechanisms && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Existing consumer protection and citizen assistance, feedback and grievance mechanisms:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {(
                  [
                    ["website", "Website"],
                    ["email", "Email"],
                    ["landline", "Landline"],
                    ["socialMedia", "Social Media"],
                    ["mobile", "Mobile"],
                  ] as const
                ).map(([mech, label]) => (
                  <label key={mech} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!value.mechanisms?.[mech]}
                      onCheckedChange={(v) =>
                        onChange({
                          ...value,
                          mechanisms: { ...DEFAULT_MECHANISMS, ...value.mechanisms, [mech]: v === true },
                        })
                      }
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <YesNoToggle
              question="Are these mechanisms already connected with online public service portals?"
              value={value.connectedToPortal ?? ""}
              onChange={(v) => onChange({ ...value, connectedToPortal: v })}
            />
          </div>
        )}

        {/* Template "If No" follow-ups */}
        {value.status === "not_utilizing" && config.ifNoOptions && (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">If No, indicate:</p>
            <div className="space-y-2">
              {config.ifNoOptions.includes("otherPlatform") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!value.ifNo?.otherPlatform}
                    onCheckedChange={(v) =>
                      onChange({ ...value, ifNo: { ...value.ifNo, otherPlatform: v === true } })
                    }
                  />
                  <span className="text-sm">Using other digital or electronic payment platform</span>
                </label>
              )}
              {config.ifNoOptions.includes("equivalent") && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!value.ifNo?.usingEquivalent}
                      onCheckedChange={(v) =>
                        onChange({ ...value, ifNo: { ...value.ifNo, usingEquivalent: v === true } })
                      }
                    />
                    <span className="text-sm">Using equivalent system</span>
                  </label>
                  {value.ifNo?.usingEquivalent && (
                    <div className="grid sm:grid-cols-2 gap-3 pl-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">IS name</label>
                        <Input
                          placeholder="Name of the equivalent system"
                          value={value.equivalentName ?? ""}
                          onChange={(e) => onChange({ ...value, equivalentName: e.target.value })}
                        />
                      </div>
                      {config.equivalentUrlOnNo && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">URL</label>
                          <Input
                            type="url"
                            inputMode="url"
                            placeholder="https://..."
                            value={value.equivalentUrl ?? ""}
                            onChange={(e) => onChange({ ...value, equivalentUrl: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {config.ifNoOptions.includes("manual") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!value.ifNo?.manual}
                    onCheckedChange={(v) =>
                      onChange({ ...value, ifNo: { ...value.ifNo, manual: v === true } })
                    }
                  />
                  <span className="text-sm">{config.manualLabel ?? "Manual processing"}</span>
                </label>
              )}
              {config.ifNoOptions.includes("proposedDev") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!value.ifNo?.proposedDevelopment}
                    onCheckedChange={(v) =>
                      onChange({ ...value, ifNo: { ...value.ifNo, proposedDevelopment: v === true } })
                    }
                  />
                  <span className="text-sm">Proposed development of equivalent system</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Conditional detail fields */}
        {showDetails && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {config.showUrl && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">System URL</label>
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  value={value.url ?? ""}
                  onChange={(e) => onChange({ ...value, url: e.target.value })}
                />
              </div>
            )}
            {config.showEquivalent && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {config.equivalentLabel ?? "Equivalent / Alternative System Name"}
                </label>
                <Input
                  placeholder="System name..."
                  value={value.equivalentName ?? ""}
                  onChange={(e) => onChange({ ...value, equivalentName: e.target.value })}
                />
              </div>
            )}
            {config.showNotes && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  placeholder="Additional notes..."
                  value={value.notes ?? ""}
                  onChange={(e) => onChange({ ...value, notes: e.target.value })}
                  rows={2}
                  className="resize-none"
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
  const [checklist, setChecklist] = useState<EgpChecklist>({
    ...DEFAULT_CHECKLIST,
    ...initialData,
  });

  const { debouncedSave } = useLocalSave("part2", "part2/d");

  const update = useCallback(
    (next: EgpChecklist) => {
      setChecklist(next);
      debouncedSave({ egpChecklist: next });
    },
    [debouncedSave]
  );

  function updateProgram(key: ProgramKey, value: EgpProgram & { adoptionPercentage?: number; channels?: string; mechanisms?: EgpPortalMechanisms; connectedToPortal?: YesNoAnswer }) {
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
  const unansweredCount = visiblePrograms.filter((p) => !checklist[p.key]?.status).length;

  return (
    <SectionShell
      sectionId="part2/d"
      title="E-Government Programs"
      description="Indicate adoption status for each government-mandated e-government program."
    >

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-xl font-bold text-success leading-none">{utilizingCount}</p>
            <p className="text-xs text-muted-foreground">Utilizing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          <div>
            <p className="text-xl font-bold text-warning leading-none">
              {visiblePrograms.filter((p) => checklist[p.key]?.status === "proposed").length}
            </p>
            <p className="text-xs text-muted-foreground">Proposed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <XCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-xl font-bold text-destructive leading-none">
              {visiblePrograms.filter((p) => checklist[p.key]?.status === "not_utilizing").length}
            </p>
            <p className="text-xs text-muted-foreground">Not Utilizing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <CircleHelp className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xl font-bold text-muted-foreground leading-none">{unansweredCount}</p>
            <p className="text-xs text-muted-foreground">Unanswered</p>
          </div>
        </div>
      </div>

      {agencyType === "LGU" && (
        <div className="rounded-lg border border-info-border bg-info-bg px-4 py-2 text-xs text-info">
          <strong>LGU:</strong> The eLGU program section is visible because your agency type is set to LGU.
        </div>
      )}

      {/* Program cards */}
      <div className="grid gap-4">
        {visiblePrograms.map((config) => (
          <ProgramCard
            key={config.key}
            config={config}
            value={(checklist[config.key] ?? DEFAULT_PROGRAM) as EgpProgram & { adoptionPercentage?: number; channels?: string; mechanisms?: EgpPortalMechanisms; connectedToPortal?: YesNoAnswer }}
            onChange={(val) => updateProgram(config.key, val)}
          />
        ))}
      </div>
    </SectionShell>
  );
}
