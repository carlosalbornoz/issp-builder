"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface HumanCapital {
  plantilla: {
    it: { male: number; female: number };
    nonIt: { male: number; female: number };
  };
  contractual: {
    it: { male: number; female: number };
    nonIt: { male: number; female: number };
  };
  outsourced: {
    it: { male: number; female: number };
    nonIt: { male: number; female: number };
  };
}

interface Part1BData {
  cioName: string;
  cioPosition: string;
  cioUnit: string;
  cioEmail: string;
  cioContact: string;
  focalName: string;
  focalPosition: string;
  focalUnit: string;
  focalEmail: string;
  focalContact: string;
  humanCapital: HumanCapital;
}

const DEFAULT_HC: HumanCapital = {
  plantilla: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
  contractual: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
  outsourced: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
};

const DEFAULT_DATA: Part1BData = {
  cioName: "", cioPosition: "", cioUnit: "", cioEmail: "", cioContact: "",
  focalName: "", focalPosition: "", focalUnit: "", focalEmail: "", focalContact: "",
  humanCapital: DEFAULT_HC,
};

function FormField({
  label, htmlFor, tooltip, children, className,
}: {
  label: string; htmlFor?: string; tooltip?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <span title={tooltip} className="cursor-help text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PersonFields({
  prefix, title, data, onChange,
}: {
  prefix: string;
  title: string;
  data: {
    name: string; position: string; unit: string; email: string; contact: string;
  };
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {title && <p className="text-sm font-semibold text-muted-foreground">{title}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name" htmlFor={`${prefix}-name`} className="sm:col-span-2">
          <Input
            id={`${prefix}-name`}
            placeholder="e.g., Juan dela Cruz"
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
          />
        </FormField>
        <FormField label="Position / Designation" htmlFor={`${prefix}-position`}>
          <Input
            id={`${prefix}-position`}
            placeholder="e.g., Undersecretary for ICT"
            value={data.position}
            onChange={(e) => onChange("position", e.target.value)}
          />
        </FormField>
        <FormField label="Office / Unit" htmlFor={`${prefix}-unit`}>
          <Input
            id={`${prefix}-unit`}
            placeholder="e.g., ICTSS"
            value={data.unit}
            onChange={(e) => onChange("unit", e.target.value)}
          />
        </FormField>
        <FormField label="Email Address" htmlFor={`${prefix}-email`}>
          <Input
            id={`${prefix}-email`}
            type="email"
            placeholder="e.g., cio@dict.gov.ph"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </FormField>
        <FormField label="Contact Number" htmlFor={`${prefix}-contact`}>
          <Input
            id={`${prefix}-contact`}
            placeholder="e.g., +63 2 1234 5678"
            value={data.contact}
            onChange={(e) => onChange("contact", e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}

type EmploymentType = "plantilla" | "contractual" | "outsourced";
type WorkerType = "it" | "nonIt";
type Gender = "male" | "female";

const EMPLOYMENT_TYPES: { key: EmploymentType; label: string }[] = [
  { key: "plantilla", label: "Plantilla" },
  { key: "contractual", label: "Contractual / Job Order" },
  { key: "outsourced", label: "Outsourced" },
];

function calcTotal(
  hc: HumanCapital,
  emp?: EmploymentType,
  type?: WorkerType,
  gender?: Gender
): number {
  const emps = emp ? [emp] : (["plantilla", "contractual", "outsourced"] as EmploymentType[]);
  const types = type ? [type] : (["it", "nonIt"] as WorkerType[]);
  const genders = gender ? [gender] : (["male", "female"] as Gender[]);
  return emps.reduce(
    (sum, e) =>
      sum +
      types.reduce(
        (s2, t) =>
          s2 + genders.reduce((s3, g) => s3 + (hc[e][t][g] || 0), 0),
        0
      ),
    0
  );
}

export function Part1BForm({
  docId, initialData,
}: {
  docId: string;
  initialData: Part1BData | null;
}) {
  const [focalSameAsCio, setFocalSameAsCio] = useState(false);

  const [data, setData] = useState<Part1BData>(() => {
    if (!initialData) return DEFAULT_DATA;
    // Deep-merge saved humanCapital with DEFAULT_HC so any missing nested
    // keys (e.g. old docs without the it/nonIt sub-objects) always resolve.
    const saved = initialData.humanCapital ?? {};
    const merged: HumanCapital = {
      plantilla: {
        it:    { ...DEFAULT_HC.plantilla.it,    ...(saved.plantilla?.it    ?? {}) },
        nonIt: { ...DEFAULT_HC.plantilla.nonIt, ...(saved.plantilla?.nonIt ?? {}) },
      },
      contractual: {
        it:    { ...DEFAULT_HC.contractual.it,    ...(saved.contractual?.it    ?? {}) },
        nonIt: { ...DEFAULT_HC.contractual.nonIt, ...(saved.contractual?.nonIt ?? {}) },
      },
      outsourced: {
        it:    { ...DEFAULT_HC.outsourced.it,    ...(saved.outsourced?.it    ?? {}) },
        nonIt: { ...DEFAULT_HC.outsourced.nonIt, ...(saved.outsourced?.nonIt ?? {}) },
      },
    };
    return { ...initialData, humanCapital: merged };
  });
  const { status, debouncedSave } = useAutoSave({ url: `/api/issp/documents/${docId}/part1`, method: "PUT" });

  const update = useCallback(
    (updates: Partial<Part1BData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave]
  );

  function setCio(field: string, value: string) {
    update({ [`cio${field.charAt(0).toUpperCase()}${field.slice(1)}`]: value } as Partial<Part1BData>);
  }

  function setFocal(field: string, value: string) {
    update({ [`focal${field.charAt(0).toUpperCase()}${field.slice(1)}`]: value } as Partial<Part1BData>);
  }

  function handleSameAsCio(checked: boolean) {
    setFocalSameAsCio(checked);
    if (checked) {
      update({
        focalName: data.cioName,
        focalPosition: data.cioPosition,
        focalUnit: data.cioUnit,
        focalEmail: data.cioEmail,
        focalContact: data.cioContact,
      });
    }
  }

  function setHC(emp: EmploymentType, type: WorkerType, gender: Gender, value: number) {
    const hc: HumanCapital = {
      ...data.humanCapital,
      [emp]: {
        ...data.humanCapital[emp],
        [type]: {
          ...data.humanCapital[emp][type],
          [gender]: value,
        },
      },
    };
    update({ humanCapital: hc });
  }

  const hc = data.humanCapital;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">
            Part I · Section B
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Organization Structure</h1>
          <p className="text-muted-foreground text-sm mt-1">
            CIO details, ISSP Focal Person, and ICT human capital breakdown.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* B.1 Key Personnel */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">B.1 Key Personnel</CardTitle>
          <CardDescription>Chief Information Officer and ISSP Focal Person contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PersonFields
            prefix="cio"
            title="Chief Information Officer (CIO)"
            data={{
              name: data.cioName,
              position: data.cioPosition,
              unit: data.cioUnit,
              email: data.cioEmail,
              contact: data.cioContact,
            }}
            onChange={setCio}
          />
          <div className="border-t" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">ISSP Focal Person</p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={focalSameAsCio}
                  onCheckedChange={(v) => handleSameAsCio(v === true)}
                />
                <span className="text-xs text-muted-foreground">
                  Concurrently held by the CIO
                </span>
              </label>
            </div>
            <div className={cn(focalSameAsCio && "opacity-50 pointer-events-none")}>
              <PersonFields
                prefix="focal"
                title=""
                data={focalSameAsCio ? {
                  name: data.cioName,
                  position: data.cioPosition,
                  unit: data.cioUnit,
                  email: data.cioEmail,
                  contact: data.cioContact,
                } : {
                  name: data.focalName,
                  position: data.focalPosition,
                  unit: data.focalUnit,
                  email: data.focalEmail,
                  contact: data.focalContact,
                }}
                onChange={setFocal}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B.2 Human Capital */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">B.2 ICT Human Capital</CardTitle>
          <CardDescription>
            Number of agency personnel by employment status, ICT/Non-ICT classification, and sex.
            Totals are computed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-3 py-2 text-left font-semibold" rowSpan={2}>
                    Employment Status
                  </th>
                  <th className="border px-3 py-2 text-center font-semibold" colSpan={3}>
                    ICT Personnel
                  </th>
                  <th className="border px-3 py-2 text-center font-semibold" colSpan={3}>
                    Non-ICT Personnel
                  </th>
                  <th className="border px-3 py-2 text-center font-semibold" rowSpan={2}>
                    Subtotal
                  </th>
                </tr>
                <tr className="bg-muted/30">
                  {["Male", "Female", "Total"].map((h) => (
                    <th key={`it-${h}`} className="border px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                  {["Male", "Female", "Total"].map((h) => (
                    <th key={`non-${h}`} className="border px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYMENT_TYPES.map(({ key, label }) => (
                  <tr key={key} className="hover:bg-muted/20">
                    <td className="border px-3 py-2 font-medium text-sm">{label}</td>
                    {/* IT */}
                    <td className="border px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded px-2 py-1.5 text-center text-sm bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={hc[key].it.male}
                        onChange={(e) => setHC(key, "it", "male", Number(e.target.value))}
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded px-2 py-1.5 text-center text-sm bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={hc[key].it.female}
                        onChange={(e) => setHC(key, "it", "female", Number(e.target.value))}
                      />
                    </td>
                    <td className="border px-3 py-2 text-center font-medium bg-muted/20">
                      {hc[key].it.male + hc[key].it.female}
                    </td>
                    {/* Non-IT */}
                    <td className="border px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded px-2 py-1.5 text-center text-sm bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={hc[key].nonIt.male}
                        onChange={(e) => setHC(key, "nonIt", "male", Number(e.target.value))}
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded px-2 py-1.5 text-center text-sm bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={hc[key].nonIt.female}
                        onChange={(e) => setHC(key, "nonIt", "female", Number(e.target.value))}
                      />
                    </td>
                    <td className="border px-3 py-2 text-center font-medium bg-muted/20">
                      {hc[key].nonIt.male + hc[key].nonIt.female}
                    </td>
                    {/* Row total */}
                    <td className="border px-3 py-2 text-center font-bold bg-muted/30">
                      {calcTotal(hc, key)}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-muted/50 font-semibold">
                  <td className="border px-3 py-2">Total</td>
                  <td className="border px-3 py-2 text-center">{calcTotal(hc, undefined, "it", "male")}</td>
                  <td className="border px-3 py-2 text-center">{calcTotal(hc, undefined, "it", "female")}</td>
                  <td className="border px-3 py-2 text-center bg-muted/40">{calcTotal(hc, undefined, "it")}</td>
                  <td className="border px-3 py-2 text-center">{calcTotal(hc, undefined, "nonIt", "male")}</td>
                  <td className="border px-3 py-2 text-center">{calcTotal(hc, undefined, "nonIt", "female")}</td>
                  <td className="border px-3 py-2 text-center bg-muted/40">{calcTotal(hc, undefined, "nonIt")}</td>
                  <td className="border px-3 py-2 text-center bg-primary/10 text-primary">{calcTotal(hc)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part1/a`} />}>
          ← Mandate, Vision &amp; Mission
        </Button>
        <Button nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part1/c`} />}>
          Next: Stakeholder Analysis →
        </Button>
      </div>
    </div>
  );
}
