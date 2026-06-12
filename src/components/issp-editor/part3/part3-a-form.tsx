"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Checkbox } from "@/components/ui/checkbox";
import { useLocalSave } from "@/hooks/use-local-save";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { SectionShell } from "@/components/editor/section-shell";
import { DiagramUploadField } from "@/components/issp-editor/diagram-upload-field";
import { CYBER_GROUPS, type CyberControlGroup } from "@/lib/cyber-controls";

type CyberControls = Record<string, Record<string, boolean>>;

interface Part3AData {
  proposedNetworkDataUrl: string | null;
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
  group: CyberControlGroup;
  currentValues: Record<string, boolean>;
  proposedValues: Record<string, boolean>;
  onProposedChange: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const proposedCount = group.items.filter((i) => proposedValues[i.key]).length;
  const mandatoryItems = group.items.filter((i) => i.mandatory);
  const proposedMandatoryCount = mandatoryItems.filter((i) => proposedValues[i.key]).length;

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
          {mandatoryItems.length > 0 && (
            <span className="text-xs text-warning bg-warning-bg border border-warning-border px-1.5 py-0.5 rounded">
              {proposedMandatoryCount}/{mandatoryItems.length} mandatory
            </span>
          )}
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
                <span className="text-sm">
                  {item.label}
                  {item.mandatory && (
                    <span className="ml-2 rounded border border-warning-border bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                      Mandatory
                    </span>
                  )}
                </span>
                {/* Current status badge — derived from Part II-B answers */}
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    hasCurrent
                      ? "bg-success-bg text-success border border-success-border"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {hasCurrent ? "Already in place (per Part II-B)" : "Not yet in place"}
                </span>
                {/* Proposed checkbox — wording shifts for controls that already exist */}
                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <Checkbox
                    checked={hasProposed}
                    onCheckedChange={(v) => onProposedChange(item.key, v === true)}
                  />
                  <span className="text-xs text-muted-foreground w-28">
                    {hasCurrent ? "Strengthen / upgrade" : "Propose to add"}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Part3AForm({ initialData }: { initialData: Part3AData }) {
  const [networkDataUrl, setNetworkDataUrl] = useState(initialData.proposedNetworkDataUrl);
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

  function handleNetworkDiagramChange(dataUrl: string | null) {
    setNetworkDataUrl(dataUrl);
    debouncedSave({ proposedNetworkDataUrl: dataUrl });
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
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Your proposed network plan should show:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Planned connectivity type per office or site</li>
              <li>Target upload/download speeds per office or site</li>
              <li>IPv6 readiness improvements</li>
              <li>Cybersecurity components to add or strengthen</li>
            </ul>
          </div>
          <Textarea
            placeholder="Describe proposed network infrastructure improvements, new equipment, topology changes, cloud migrations, etc."
            value={networkDesc}
            onChange={(e) => {
              setNetworkDesc(e.target.value);
              triggerSave(e.target.value, controls);
            }}
            rows={5}
          />
          <DiagramUploadField
            value={networkDataUrl}
            onChange={handleNetworkDiagramChange}
            title="Proposed Network Diagram"
            emptyTitle="Click to upload a proposed network diagram"
            emptyDescription="PNG, JPG, WebP, or SVG - max 10 MB"
            alt="Proposed network diagram"
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
