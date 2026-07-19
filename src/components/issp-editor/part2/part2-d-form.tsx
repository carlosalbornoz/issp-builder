"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalSave } from "@/hooks/use-local-save";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/editor/section-shell";
import { YesNoToggle, type YesNoAnswer } from "@/components/issp-editor/yes-no-toggle";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Template checklist is strictly Yes/No — no "Proposed" or "Not Applicable" box exists. */
type Status = YesNoAnswer;

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

// ─── EGP programs config ───────────────────────────────────────────────────────
// Titles, question wording, and column layout mirror the DICT reference template
// (references/egp-checklist.docx) exactly, row by row.

type ProgramKey = keyof EgpChecklist;

type IfNoOption = "equivalent" | "manual" | "proposedDev" | "otherPlatform";

interface ProgramConfig {
  key: ProgramKey;
  /** Official template title (Part II.D row title). */
  label: string;
  /** Short, commonly-used name shown alongside the title for recognizability. */
  aka?: string;
  description: string;
  lguOnly?: boolean;
  /** Exact template Yes/No question. Omitted for pnpki/onlinePortal, which have no Yes/No in the template. */
  question?: string;
  showUrlOnYes?: boolean;
  /** Show the system-name input when Yes (template "If Yes, indicate the system"). */
  showEquivalentOnYes?: boolean;
  equivalentLabel?: string;
  /** Template "If No" follow-up checkboxes shown when status = No. */
  ifNoOptions?: IfNoOption[];
  manualLabel?: string;
  /** eLGU: the equivalent system needs a URL as well as a name. */
  equivalentUrlOnNo?: boolean;
  /** Item 3: PNPKI adoption percentage (unconditional, no Yes/No). */
  showAdoptionPercent?: boolean;
  /** Item 6: feedback-mechanism checkboxes + connected-to-portal question (unconditional, no Yes/No). */
  portalMechanisms?: boolean;
}

const PROGRAMS: ProgramConfig[] = [
  {
    key: "elgu",
    label: "Electronic Local Government Unit (ELGU) System",
    aka: "eLGU",
    description: "Integrated local government operations management system for LGUs.",
    lguOnly: true,
    question: "Is your LGU already utilizing the eLGU system?",
    showUrlOnYes: true,
    ifNoOptions: ["equivalent", "manual"],
    manualLabel: "Manual Transaction",
    equivalentUrlOnNo: true,
  },
  {
    key: "eGovPay",
    label: "Government Digital Payment System for Collection and Disbursement",
    aka: "eGovPay",
    description: "Government payment gateway for online and over-the-counter payments.",
    question: "Is your agency utilizing eGovPay?",
    ifNoOptions: ["otherPlatform", "manual", "proposedDev"],
    manualLabel: "Manual Transaction",
  },
  {
    key: "pnpki",
    label: "Government Public Key Infrastructure (PKI) Program",
    aka: "PNPKI",
    description: "Digital certificate infrastructure for secure government communications.",
    showAdoptionPercent: true,
  },
  {
    key: "hcmis",
    label: "Human Capital Management Information System (HCMIS)",
    description: "Centralized HRMS platform for government agencies.",
    question: "Is your agency utilizing the HCMIS?",
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "ifmis",
    label: "Integrated Financial Management Information System (IFMIS)",
    description: "Government financial management system.",
    question: "Is your agency utilizing the IFMIS?",
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "onlinePortal",
    label: "Online Public Service Portal",
    description:
      "Consumer protection and citizen assistance, feedback and grievance mechanisms, and their connection to online public service portals.",
    portalMechanisms: true,
  },
  {
    key: "procurement",
    label: "Procurement System",
    aka: "PhilGEPS",
    description: "Government procurement transparency and management portal (Philippine Government Procurement System).",
    question: "Is your agency utilizing the Philippine Government Procurement System?",
    ifNoOptions: ["equivalent", "manual", "proposedDev"],
    manualLabel: "Manual processing",
  },
  {
    key: "recordsMgmt",
    label: "Records and Knowledge Management Information System",
    description: "Repository for records and knowledge management in the agency.",
    question: "Is there an existing repository for Records and Knowledge Management in your agency?",
    showEquivalentOnYes: true,
    equivalentLabel: "Indicate the system",
  },
  {
    key: "pscp",
    label: "Public Service Continuity Plan",
    aka: "PSCP",
    description:
      "Documented plan to ensure continued delivery of public services during disruptions and emergencies.",
    question: "Is there an existing Public Service Continuity Plan in your agency?",
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
  const isYesNoRow = !!config.question;
  const isYes = value.status === "yes";
  const isUnanswered = isYesNoRow && !value.status;

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
            <CardTitle className="text-sm font-semibold leading-snug">
              {config.label}
              {config.aka && <span className="ml-2 font-normal text-muted-foreground">({config.aka})</span>}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
          </div>
          {isYesNoRow && (
            value.status ? (
              <Badge
                variant="outline"
                className={cn("shrink-0 gap-1 text-xs", isYes ? "text-success" : "text-destructive")}
              >
                {isYes ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {isYes ? "Utilizing" : "Not Utilizing"}
              </Badge>
            ) : (
              <span className="shrink-0 rounded-md border border-warning-border bg-warning-bg px-2 py-1 text-xs font-medium text-warning">
                Needs answer
              </span>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Yes/No question — the template's actual per-row question */}
        {config.question && (
          <YesNoToggle
            question={config.question}
            value={value.status}
            onChange={(v) => onChange({ ...value, status: v })}
          />
        )}

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
        {value.status === "no" && config.ifNoOptions && (
          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
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

        {/* Template "If Yes" details */}
        {isYes && (config.showUrlOnYes || config.showEquivalentOnYes) && (
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {config.showUrlOnYes && (
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
            {config.showEquivalentOnYes && (
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

  // Summary stats only cover rows with an actual template Yes/No question —
  // PNPKI and the Online Portal have no such concept.
  const yesNoPrograms = visiblePrograms.filter((p) => p.question);
  const utilizingCount = yesNoPrograms.filter((p) => checklist[p.key]?.status === "yes").length;
  const notUtilizingCount = yesNoPrograms.filter((p) => checklist[p.key]?.status === "no").length;
  const unansweredCount = yesNoPrograms.filter((p) => !checklist[p.key]?.status).length;

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
          <XCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-xl font-bold text-destructive leading-none">{notUtilizingCount}</p>
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
