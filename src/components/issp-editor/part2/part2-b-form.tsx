"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useLocalSave } from "@/hooks/use-local-save";
import { cn } from "@/lib/utils";
import { ChevronDown, UploadCloud, ImageIcon, Trash2 } from "lucide-react";

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

type GroupKey = keyof CyberGroup;

const CYBER_GROUPS: {
  key: GroupKey;
  label: string;
  color: string;
  items: { key: string; label: string }[];
}[] = [
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
    items: [
      { key: "securityScanning", label: "Security scanning / code review" },
    ],
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

// ─── Component ─────────────────────────────────────────────────────────────────

function ChecklistGroup({
  group,
  values,
  onChange,
}: {
  group: (typeof CYBER_GROUPS)[number];
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const checkedCount = group.items.filter((i) => values[i.key]).length;

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
  const router = useRouter();
  const [networkDescription, setNetworkDescription] = useState(
    initialData?.networkDescription ?? ""
  );
  const [diagrams, setDiagrams] = useState<NetworkDiagram[]>(
    initialData?.networkDiagrams ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { status, debouncedSave } = useLocalSave("part2");

  const saveDiagrams = useCallback(
    (updated: NetworkDiagram[]) => {
      setDiagrams(updated);
      debouncedSave({ networkDiagrams: updated });
    },
    [debouncedSave]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newDiagram: NetworkDiagram = {
        id: Math.random().toString(36).slice(2, 10),
        dataUrl,
        title: "",
      };
      saveDiagrams([...diagrams, newDiagram]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      setUploadError("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
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

  function handleCheck(groupKey: GroupKey, itemKey: string, checked: boolean) {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
            Part II · Section B
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Network &amp; Cybersecurity
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe the current network infrastructure and cybersecurity controls in place.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* B.1 Network description */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">B.1 Network Infrastructure</CardTitle>
          <CardDescription>
            Describe the agency&apos;s current network topology, connectivity, and key infrastructure components.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
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
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 focus:placeholder:text-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDiagram(diagram.id)}
                        aria-label="Remove diagram"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
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

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/editor/part2/a")}
        >
          ← Strategic Concerns
        </Button>
        <Button onClick={() => router.push("/editor/part2/c")}>
          Next: IS Inventory →
        </Button>
      </div>
    </div>
  );
}
