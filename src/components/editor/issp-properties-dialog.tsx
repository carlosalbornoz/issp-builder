"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import type { AgencyType, IsspScope } from "@/lib/store";
import { LOGO_ACCEPT, getLogoUploadError, readFileAsDataUrl } from "@/lib/diagram-upload";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

// ─── Lookup tables ────────────────────────────────────────────────────────────

export const AGENCY_TYPES: { value: AgencyType; label: string }[] = [
  { value: "NGA", label: "National Government Agency (NGA)" },
  { value: "GOCC", label: "Government-Owned or Controlled Corporation (GOCC)" },
  { value: "LGU", label: "Local Government Unit (LGU)" },
  { value: "OTHER", label: "Other Government Entity" },
];

export const SCOPE_OPTIONS: { value: IsspScope; label: string }[] = [
  { value: "DEPARTMENT_WIDE", label: "Department-wide" },
  { value: "DEPARTMENT_CENTRAL_ONLY", label: "Department — Central Office Only" },
  { value: "CENTRAL_ONLY", label: "Central Office Only" },
  { value: "WITH_REGIONAL", label: "Central + Regional Offices" },
  { value: "WITH_BUREAUS", label: "Central + Bureaus" },
  { value: "AGENCY_WIDE", label: "Agency-wide" },
  { value: "AGENCY_CENTRAL_ONLY", label: "Agency — Central Office Only" },
  { value: "AGENCY_WITH_REGIONAL", label: "Agency with Regional Offices" },
  { value: "OTHER_GOVERNMENT_ENTITY", label: "Other Government Entity" },
  { value: "LGU_SCOPE", label: "Local Government Unit" },
];

export const SCOPE_LABELS = Object.fromEntries(
  SCOPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<IsspScope, string>;

export const AMENDMENT_LABELS: Record<number, string> = {
  0: "Regular ISSP",
  1: "Amendment 1",
  2: "Amendment 2",
  3: "Amendment 3",
};

// Locked per MITHI Resolution 2026-02
export const ISSP_START_YEAR = 2028;
export const ISSP_END_YEAR = 2030;

// ─── Shared form shape ────────────────────────────────────────────────────────

export interface IsspForm {
  agencyName: string;
  agencyAcronym: string;
  agencyType: AgencyType;
  agencyWebsite: string;
  agencyHeadName: string;
  agencyLogo: string | null;
  startYear: number;
  scope: IsspScope;
  amendmentNumber: number;
}

export const BLANK_FORM: IsspForm = {
  agencyName: "",
  agencyAcronym: "",
  agencyType: "NGA",
  agencyWebsite: "",
  agencyHeadName: "",
  agencyLogo: null,
  startYear: ISSP_START_YEAR,
  scope: "AGENCY_WIDE",
  amendmentNumber: 0,
};

// ─── Shared form fields ───────────────────────────────────────────────────────

export function IsspFormFields({
  form,
  set,
  idPrefix = "",
}: {
  form: IsspForm;
  set: <K extends keyof IsspForm>(key: K, value: IsspForm[K]) => void;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}${name}`;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  async function handleLogoFile(file: File | undefined) {
    if (!file) return;
    const error = getLogoUploadError(file);
    if (error) {
      toast.error(error);
      return;
    }
    setLogoLoading(true);
    try {
      set("agencyLogo", await readFileAsDataUrl(file));
    } catch {
      toast.error("Failed to read the image. Please try another file.");
    } finally {
      setLogoLoading(false);
    }
  }

  return (
    <div className="space-y-4 py-1">
      {/* Agency */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Agency
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor={id("agencyName")}>Agency Name</Label>
              <Input
                id={id("agencyName")}
                placeholder="e.g., Department of Information and Communications Technology"
                value={form.agencyName}
                onChange={(e) => set("agencyName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={id("agencyAcronym")}>Acronym</Label>
              <Input
                id={id("agencyAcronym")}
                placeholder="e.g., DICT"
                className="w-28"
                value={form.agencyAcronym}
                onChange={(e) => set("agencyAcronym", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={id("agencyType")}>Agency Type</Label>
            <Select
              items={AGENCY_TYPES}
              value={form.agencyType}
              onValueChange={(v: string | null) =>
                v && set("agencyType", v as AgencyType)
              }
            >
              <SelectTrigger id={id("agencyType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENCY_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={id("agencyWebsite")}>
              Website URL{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id={id("agencyWebsite")}
              type="url"
              placeholder="e.g., https://dict.gov.ph"
              value={form.agencyWebsite}
              onChange={(e) => set("agencyWebsite", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={id("agencyHeadName")}>Agency Head Name</Label>
            <Input
              id={id("agencyHeadName")}
              placeholder="e.g., Secretary Juan dela Cruz"
              value={form.agencyHeadName}
              onChange={(e) => set("agencyHeadName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Agency Logo{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <input
              ref={logoInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleLogoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                {logoLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : form.agencyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.agencyLogo} alt="Agency logo" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={logoLoading} onClick={() => logoInputRef.current?.click()}>
                  {logoLoading ? "Reading…" : form.agencyLogo ? "Replace" : "Upload logo"}
                </Button>
                {form.agencyLogo && !logoLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => set("agencyLogo", null)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Replaces the DICT logo in the PDF cover and page header. PNG, JPG, WebP, or SVG, up to 2 MB.
            </p>
          </div>
        </div>
      </div>

      {/* Coverage Period */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Coverage Period
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Start Year</Label>
            <Input value={ISSP_START_YEAR} readOnly className="bg-muted cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label>End Year</Label>
            <Input value={ISSP_END_YEAR} readOnly className="bg-muted cursor-not-allowed" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Locked to 2028–2030 per MITHI Resolution 2026-02.
        </p>
      </div>

      {/* Scope & Type */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Scope & Type
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={id("scope")}>ISSP Scope</Label>
            <Select
              items={SCOPE_OPTIONS}
              value={form.scope}
              onValueChange={(v: string | null) =>
                v && set("scope", v as IsspScope)
              }
            >
              <SelectTrigger id={id("scope")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={id("amendment")}>Document Type</Label>
            <Select
              items={[0, 1, 2, 3].map((n) => ({ value: String(n), label: AMENDMENT_LABELS[n] }))}
              value={String(form.amendmentNumber)}
              onValueChange={(v: string | null) =>
                v && set("amendmentNumber", parseInt(v))
              }
            >
              <SelectTrigger id={id("amendment")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {AMENDMENT_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ISSP Properties dialog ───────────────────────────────────────────────────

export function IsspPropertiesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { doc, update } = useIsspStore();
  const [form, setForm] = useState<IsspForm>(BLANK_FORM);

  // Seed the form only when the dialog opens (closed→open). Reading `doc` here
  // rather than via an effect on [open, doc] means background autosave updates
  // (which rewrite `doc` on every keystroke elsewhere) can't clobber edits in
  // progress while the dialog is open.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen && doc) {
    setWasOpen(true);
    setForm({
      agencyName: doc.agency.name,
      agencyAcronym: doc.agency.acronym,
      agencyType: doc.agency.type as AgencyType,
      agencyWebsite: doc.agency.websiteUrl ?? "",
      agencyHeadName: doc.agencyHeadName ?? "",
      agencyLogo: doc.agency.logoBase64 ?? null,
      startYear: doc.startYear,
      scope: doc.scope,
      amendmentNumber: doc.amendmentNumber,
    });
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const endYear = ISSP_END_YEAR;
  const title = `${form.agencyAcronym || form.agencyName ? (form.agencyAcronym || form.agencyName) + " " : ""}Information Systems Strategic Plan ${form.startYear}–${endYear}`;

  function set<K extends keyof IsspForm>(key: K, value: IsspForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.agencyName.trim() || !form.agencyAcronym.trim() || !form.agencyHeadName.trim()) return;
    update((prev) => ({
      ...prev,
      title,
      startYear: form.startYear,
      endYear,
      amendmentNumber: form.amendmentNumber,
      scope: form.scope,
      agencyHeadName: form.agencyHeadName.trim(),
      agency: {
        ...prev.agency,
        name: form.agencyName.trim(),
        acronym: form.agencyAcronym.trim(),
        type: form.agencyType as AgencyType,
        websiteUrl: form.agencyWebsite.trim(),
        logoBase64: form.agencyLogo,
      },
    }));
    onClose();
  }

  const isValid =
    form.agencyName.trim().length > 0 &&
    form.agencyAcronym.trim().length > 0 &&
    form.agencyHeadName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ISSP Properties</DialogTitle>
        </DialogHeader>

        <IsspFormFields form={form} set={set} idPrefix="props-" />

        <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground text-sm leading-snug">{title}</p>
          <p>
            {form.startYear}–{endYear} · {SCOPE_LABELS[form.scope]} ·{" "}
            {AMENDMENT_LABELS[form.amendmentNumber]}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
