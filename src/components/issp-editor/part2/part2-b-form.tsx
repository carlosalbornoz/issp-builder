"use client";

import { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalSave } from "@/hooks/use-local-save";
import { cn } from "@/lib/utils";
import { ChevronDown, UploadCloud, ImageIcon } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SectionShell } from "@/components/editor/section-shell";
import { DIAGRAM_ACCEPT, createDiagramId, getDiagramUploadError, readFileAsDataUrl } from "@/lib/diagram-upload";
import { CYBER_GROUPS, type CyberControlGroup, type CyberGroupKey } from "@/lib/cyber-controls";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CyberGroup {
  physical: {
    perimeterProtection: boolean;
    accessControl: boolean;
    surveillance: boolean;
    detection: boolean;
  };
  perimeter: {
    ngfw: boolean;
    idsIps: boolean;
    waf: boolean;
    dmz: boolean;
  };
  network: {
    dataEncryption: boolean;
    networkSegmentation: boolean;
  };
  endpoint: {
    antivirus: boolean;
    appControl: boolean;
    byod: boolean;
    xdr: boolean;
  };
  data: {
    dataClassification: boolean;
    dlp: boolean;
    backupRecovery: boolean;
  };
  application: {
    securityScanning: boolean;
  };
  other: {
    vulnAssessment: boolean;
    patchMgmt: boolean;
    strongPasswords: boolean;
    mfa: boolean;
    accessReviews: boolean;
    securityLogs: boolean;
    logAnalysis: boolean;
    incidentResponse: boolean;
    siem: boolean;
    penTesting: boolean;
    secureSdlc: boolean;
  };
}

const DEFAULT_CYBER: CyberGroup = {
  physical: { perimeterProtection: false, accessControl: false, surveillance: false, detection: false },
  perimeter: { ngfw: false, idsIps: false, waf: false, dmz: false },
  network: { dataEncryption: false, networkSegmentation: false },
  endpoint: { antivirus: false, appControl: false, byod: false, xdr: false },
  data: { dataClassification: false, dlp: false, backupRecovery: false },
  application: { securityScanning: false },
  other: {
    vulnAssessment: false, patchMgmt: false, strongPasswords: false,
    mfa: false, accessReviews: false, securityLogs: false,
    logAnalysis: false, incidentResponse: false, siem: false,
    penTesting: false, secureSdlc: false,
  },
};

interface NetworkDiagram {
  id: string;
  dataUrl: string;
  title: string;
}

interface Part2BData {
  networkDiagrams: NetworkDiagram[];
  networkDescription: string;
  cybersecurityControls: CyberGroup;
}

interface Part2BFormProps {
  initialData: Part2BData | null;
}

// ─── Checkbox groups config ────────────────────────────────────────────────────

// ─── Component ─────────────────────────────────────────────────────────────────

function ChecklistGroup({
  group,
  values,
  onChange,
}: {
  group: CyberControlGroup;
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const checkedCount = group.items.filter((i) => values[i.key]).length;
  const mandatoryItems = group.items.filter((i) => i.mandatory);
  const checkedMandatoryCount = mandatoryItems.filter((i) => values[i.key]).length;

  return (
    <div className={cn("rounded-lg border border-l-4 overflow-hidden", group.color)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{group.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {checkedCount}/{group.items.length}
          </span>
          {mandatoryItems.length > 0 && (
            <span className="text-xs text-warning bg-warning-bg border border-warning-border px-1.5 py-0.5 rounded">
              {checkedMandatoryCount}/{mandatoryItems.length} mandatory
            </span>
          )}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "" : "-rotate-90")}
        />
      </button>

      {open && (
        <div className="grid sm:grid-cols-2 gap-3 p-4">
          {group.items.map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <Checkbox
                id={`${group.key}-${item.key}`}
                checked={!!values[item.key]}
                onCheckedChange={(checked) =>
                  onChange(item.key, checked === true)
                }
                className="mt-0.5"
              />
              <span className="text-sm leading-snug group-hover:text-foreground text-muted-foreground transition-colors">
                {item.label}
                {item.mandatory && (
                  <span className="ml-2 rounded border border-warning-border bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                    Mandatory
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function Part2BForm({ initialData }: Part2BFormProps) {
  const initialDiagrams = initialData?.networkDiagrams ?? [];
  const [networkDescription, setNetworkDescription] = useState(
    initialData?.networkDescription ?? ""
  );
  const [diagrams, setDiagrams] = useState<NetworkDiagram[]>(initialDiagrams);
  const diagramsRef = useRef<NetworkDiagram[]>(initialDiagrams);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { debouncedSave } = useLocalSave("part2", "part2/b");

  const saveDiagrams = useCallback(
    (updated: NetworkDiagram[]) => {
      diagramsRef.current = updated;
      setDiagrams(updated);
      debouncedSave({ networkDiagrams: updated });
    },
    [debouncedSave]
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadError(null);

    const error = getDiagramUploadError(file);
    if (error) {
      setUploadError(error);
      input.value = "";
      return;
    }

    setUploading(true);
    let dataUrl: string;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      setUploadError("Failed to read file.");
      setUploading(false);
      return;
    }

    try {
      const newDiagram: NetworkDiagram = { id: createDiagramId(), dataUrl, title: "" };
      saveDiagrams([...diagramsRef.current, newDiagram]);
      input.value = "";
    } catch {
      setUploadError("Failed to add diagram.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveDiagram(diagramId: string) {
    saveDiagrams(diagrams.filter((d) => d.id !== diagramId));
  }

  function handleTitleChange(diagramId: string, title: string) {
    saveDiagrams(diagrams.map((d) => (d.id === diagramId ? { ...d, title } : d)));
  }

  const [controls, setControls] = useState<CyberGroup>(() => {
    const saved = initialData?.cybersecurityControls;
    if (!saved) return DEFAULT_CYBER;
    return {
      physical:    { ...DEFAULT_CYBER.physical,    ...saved.physical },
      perimeter:   { ...DEFAULT_CYBER.perimeter,   ...saved.perimeter },
      network:     { ...DEFAULT_CYBER.network,     ...saved.network },
      endpoint:    { ...DEFAULT_CYBER.endpoint,    ...saved.endpoint },
      data:        { ...DEFAULT_CYBER.data,        ...saved.data },
      application: { ...DEFAULT_CYBER.application, ...saved.application },
      other:       { ...DEFAULT_CYBER.other,       ...saved.other },
    };
  });

  const triggerSave = useCallback(
    (desc: string, ctrl: CyberGroup) => {
      debouncedSave({ networkDescription: desc, cybersecurityControls: ctrl });
    },
    [debouncedSave]
  );

  function handleDescChange(val: string) {
    setNetworkDescription(val);
    triggerSave(val, controls);
  }

  function handleCheck(groupKey: CyberGroupKey, itemKey: string, checked: boolean) {
    const updated = {
      ...controls,
      [groupKey]: { ...controls[groupKey], [itemKey]: checked },
    };
    setControls(updated);
    triggerSave(networkDescription, updated);
  }

  const totalChecked = CYBER_GROUPS.reduce(
    (sum, g) => sum + g.items.filter((i) => (controls[g.key] as Record<string, boolean>)[i.key]).length,
    0
  );
  const totalItems = CYBER_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <SectionShell
      sectionId="part2/b"
      title="Network &amp; Cybersecurity"
      description="Describe the current network infrastructure and cybersecurity controls in place."
    >

      {/* B.1 Network description */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">B.1 Network Infrastructure</CardTitle>
          <CardDescription>
            Describe the agency&apos;s current network topology, connectivity, and key infrastructure components.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Your diagram or description should show:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Connectivity type per office or site</li>
              <li>Upload/download speeds per office or site</li>
              <li>IPv6 readiness</li>
              <li>Cybersecurity components in the network</li>
            </ul>
          </div>
          <Textarea
            placeholder="Describe the agency's network infrastructure — topology, internet connectivity, LAN/WAN, cloud services, data centers, etc."
            value={networkDescription}
            onChange={(e) => handleDescChange(e.target.value)}
            rows={6}
          />

          {/* Network diagram upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Network Diagrams</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Add Diagram"}
              </button>
            </div>

            {diagrams.length > 0 && (
              <div className="space-y-4">
                {diagrams.map((diagram, idx) => (
                  <div key={diagram.id} className="rounded-lg border overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                      <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        maxLength={120}
                        placeholder="Diagram title — e.g., Central Office Network Topology"
                        value={diagram.title}
                        onChange={(e) => handleTitleChange(diagram.id, e.target.value)}
                        className="flex-1 rounded bg-card/70 px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 hover:bg-card focus:bg-card focus:placeholder:text-transparent"
                      />
                      <ConfirmDeleteButton
                        ariaLabel="Remove diagram"
                        confirmText="Delete diagram?"
                        onDelete={() => handleRemoveDiagram(diagram.id)}
                      />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={diagram.dataUrl}
                      alt={diagram.title || `Network diagram ${idx + 1}`}
                      className="w-full max-h-[480px] object-contain bg-white p-3"
                    />
                  </div>
                ))}
              </div>
            )}

            {diagrams.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-full rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  uploading ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                )}
              >
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  {uploading ? "Uploading…" : "Click to upload a network diagram"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PNG, JPG, WebP, or SVG — max 10 MB each
                </p>
              </button>
            )}

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={DIAGRAM_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* B.2 Cybersecurity checklist */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">B.2 Cybersecurity Controls</CardTitle>
          <CardDescription>
            Check all security controls currently implemented by the agency.{" "}
            <span className="font-medium text-foreground">{totalChecked} of {totalItems}</span> controls implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CYBER_GROUPS.map((group) => (
            <ChecklistGroup
              key={group.key}
              group={group}
              values={controls[group.key] as Record<string, boolean>}
              onChange={(itemKey, checked) => handleCheck(group.key, itemKey, checked)}
            />
          ))}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
