"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Checkbox } from "@/components/ui/checkbox";
import { useLocalSave } from "@/hooks/use-local-save";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { SectionShell } from "@/components/editor/section-shell";

// Reuse the same control groups structure from Part II-B
const CYBER_GROUPS = [
  {
    key: "physical",
    label: "Physical Security",
    color: "border-l-slate-400",
    items: [
      { key: "perimeterProtection", label: "Perimeter protection (fences, barriers)" },
      { key: "accessControl", label: "Physical access control (key cards, locks)" },
      { key: "surveillance", label: "CCTV / surveillance cameras" },
      { key: "detection", label: "Motion / intrusion detection systems" },
    ],
  },
  {
    key: "perimeter",
    label: "Perimeter Security",
    color: "border-l-blue-400",
    items: [
      { key: "ngfw", label: "Next-Generation Firewall (NGFW)" },
      { key: "idsIps", label: "Intrusion Detection / Prevention System (IDS/IPS)" },
      { key: "waf", label: "Web Application Firewall (WAF)" },
      { key: "dmz", label: "Demilitarized Zone (DMZ)" },
    ],
  },
  {
    key: "network",
    label: "Network Security",
    color: "border-l-cyan-400",
    items: [
      { key: "dataEncryption", label: "Data encryption in transit (TLS/SSL)" },
      { key: "networkSegmentation", label: "Network segmentation / VLANs" },
    ],
  },
  {
    key: "endpoint",
    label: "Endpoint Security",
    color: "border-l-green-400",
    items: [
      { key: "antivirus", label: "Antivirus / Anti-malware" },
      { key: "appControl", label: "Application whitelisting / control" },
      { key: "byod", label: "BYOD policy and management" },
      { key: "xdr", label: "Extended Detection & Response (XDR/EDR)" },
    ],
  },
  {
    key: "data",
    label: "Data Security",
    color: "border-l-amber-400",
    items: [
      { key: "dataClassification", label: "Data classification and labeling" },
      { key: "dlp", label: "Data Loss Prevention (DLP)" },
      { key: "backupRecovery", label: "Regular backup and disaster recovery" },
    ],
  },
  {
    key: "application",
    label: "Application Security",
    color: "border-l-orange-400",
    items: [{ key: "securityScanning", label: "Security scanning / code review" }],
  },
  {
    key: "other",
    label: "Other Security Measures",
    color: "border-l-purple-400",
    items: [
      { key: "vulnAssessment", label: "Vulnerability assessment & management" },
      { key: "patchMgmt", label: "Patch management program" },
      { key: "strongPasswords", label: "Password policy (complexity, rotation)" },
      { key: "mfa", label: "Multi-Factor Authentication (MFA)" },
      { key: "accessReviews", label: "Periodic access reviews / recertification" },
      { key: "securityLogs", label: "Security event logging" },
      { key: "logAnalysis", label: "Log monitoring & analysis" },
      { key: "incidentResponse", label: "Incident response plan" },
      { key: "siem", label: "Security Information & Event Management (SIEM)" },
      { key: "penTesting", label: "Penetration testing / red team exercises" },
      { key: "secureSdlc", label: "Secure Software Development Lifecycle (SSDLC)" },
    ],
  },
];

type CyberControls = Record<string, Record<string, boolean>>;

interface Part3AData {
  proposedNetworkDesc: string;
  proposedCybersecControls: CyberControls;
  currentNetworkDesc: string;
  currentCybersecControls: CyberControls;
}

function ChecklistSection({
  group,
  currentValues,
  proposedValues,
  onProposedChange,
}: {
  group: (typeof CYBER_GROUPS)[number];
  currentValues: Record<string, boolean>;
  proposedValues: Record<string, boolean>;
  onProposedChange: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const proposedCount = group.items.filter((i) => proposedValues[i.key]).length;

  return (
    <div className={cn("rounded-lg border border-l-4 overflow-hidden", group.color)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{group.label}</span>
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
            {proposedCount}/{group.items.length} proposed
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "" : "-rotate-90")} />
      </button>

      {open && (
        <div className="divide-y">
          {group.items.map((item) => {
            const hasCurrent = !!currentValues[item.key];
            const hasProposed = !!proposedValues[item.key];
            return (
              <div key={item.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5">
                <span className="text-sm">{item.label}</span>
                {/* Current status badge */}
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    hasCurrent
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {hasCurrent ? "Current" : "Not current"}
                </span>
                {/* Proposed checkbox */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Checkbox
                    checked={hasProposed}
                    onCheckedChange={(v) => onProposedChange(item.key, v === true)}
                  />
                  <span className="text-xs text-muted-foreground">Proposed</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Part3AForm({ initialData }: { initialData: Part3AData }) {
  const [networkDesc, setNetworkDesc] = useState(initialData.proposedNetworkDesc);
  const [controls, setControls] = useState<CyberControls>(initialData.proposedCybersecControls);

  const { debouncedSave } = useLocalSave("part3", "part3/a");

  const triggerSave = useCallback(
    (desc: string, ctrl: CyberControls) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debouncedSave({ proposedNetworkDesc: desc, proposedCybersecControls: ctrl as any });
    },
    [debouncedSave]
  );

  function handleCheck(groupKey: string, itemKey: string, checked: boolean) {
    const updated = {
      ...controls,
      [groupKey]: { ...(controls[groupKey] ?? {}), [itemKey]: checked },
    };
    setControls(updated);
    triggerSave(networkDesc, updated);
  }

  return (
    <SectionShell
      sectionId="part3/a"
      title="Proposed Infrastructure"
      description="Describe the proposed network infrastructure and cybersecurity controls for the plan period."
    >

      {/* A.1 Network */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">A.1 Proposed Network Infrastructure</CardTitle>
          <CardDescription>
            Describe planned changes or improvements to the network topology, connectivity, or equipment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialData.currentNetworkDesc && (
            <div className="rounded-lg bg-muted/30 border p-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Current (from Part II-B)
              </p>
              <p className="text-muted-foreground whitespace-pre-line">{initialData.currentNetworkDesc}</p>
            </div>
          )}
          <Textarea
            placeholder="Describe proposed network infrastructure improvements, new equipment, topology changes, cloud migrations, etc."
            value={networkDesc}
            onChange={(e) => {
              setNetworkDesc(e.target.value);
              triggerSave(e.target.value, controls);
            }}
            rows={5}
          />
        </CardContent>
      </Card>

      {/* A.2 Cybersecurity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">A.2 Proposed Cybersecurity Controls</CardTitle>
          <CardDescription>
            Check controls to be <strong>added or strengthened</strong> during the ISSP period. 
            Current controls are shown for reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CYBER_GROUPS.map((group) => (
            <ChecklistSection
              key={group.key}
              group={group}
              currentValues={(initialData.currentCybersecControls[group.key] ?? {}) as Record<string, boolean>}
              proposedValues={(controls[group.key] ?? {}) as Record<string, boolean>}
              onProposedChange={(itemKey, checked) => handleCheck(group.key, itemKey, checked)}
            />
          ))}
        </CardContent>
      </Card>

    </SectionShell>
  );
}
