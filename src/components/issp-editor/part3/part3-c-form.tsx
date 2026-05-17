"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Plus, Trash2 } from "lucide-react";

interface HCRow {
  id: string;
  position: string;
  employmentStatus: "PLANTILLA" | "CONTRACTUAL" | "OUTSOURCED" | "";
  quantity: number;
}

const EMPLOYMENT_OPTIONS = [
  { value: "PLANTILLA", label: "Plantilla" },
  { value: "CONTRACTUAL", label: "Contractual / Job Order" },
  { value: "OUTSOURCED", label: "Outsourced" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Part3CForm({
  docId,
  initialData,
}: {
  docId: string;
  initialData: HCRow[];
}) {
  const [rows, setRows] = useState<HCRow[]>(initialData);
  const { status, debouncedSave } = useAutoSave({
    url: `/api/issp/documents/${docId}/part3`,
    method: "PUT",
  });

  const update = useCallback(
    (next: HCRow[]) => {
      setRows(next);
      debouncedSave({ proposedHumanCapital: next });
    },
    [debouncedSave]
  );

  function addRow() {
    update([...rows, { id: generateId(), position: "", employmentStatus: "", quantity: 1 }]);
  }

  function removeRow(id: string) {
    update(rows.filter((r) => r.id !== id));
  }

  function updateRow<K extends keyof HCRow>(id: string, field: K, value: HCRow[K]) {
    update(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const totalByStatus = EMPLOYMENT_OPTIONS.reduce<Record<string, number>>((acc, o) => {
    acc[o.value] = rows.filter((r) => r.employmentStatus === o.value).reduce((s, r) => s + r.quantity, 0);
    return acc;
  }, {});
  const grandTotal = rows.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section C
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Proposed ICT Human Capital</h1>
          <p className="text-muted-foreground text-sm mt-1">
            List the ICT positions to be filled or created during the ISSP period.
          </p>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border bg-card px-3 py-2 text-center">
          <p className="text-2xl font-bold">{grandTotal}</p>
          <p className="text-xs text-muted-foreground">Total Positions</p>
        </div>
        {EMPLOYMENT_OPTIONS.map((o) => (
          <div key={o.value} className="rounded-lg border bg-card px-3 py-2 text-center">
            <p className="text-2xl font-bold">{totalByStatus[o.value] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{o.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Proposed Positions</CardTitle>
              <CardDescription className="mt-1">
                {rows.length} position type{rows.length !== 1 ? "s" : ""} added
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-3 py-2 text-left font-semibold">Position / Designation</th>
                  <th className="border px-3 py-2 text-left font-semibold w-52">Employment Status</th>
                  <th className="border px-3 py-2 text-center font-semibold w-28">No. of Positions</th>
                  <th className="border px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border px-3 py-8 text-center text-muted-foreground text-sm">
                      No positions added.{" "}
                      <button type="button" onClick={addRow} className="font-medium text-primary hover:underline">
                        Add the first one.
                      </button>
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded px-2 py-1.5 text-sm bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g., Systems Developer II"
                        value={row.position}
                        onChange={(e) => updateRow(row.id, "position", e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <Select
                        items={EMPLOYMENT_OPTIONS}
                        value={row.employmentStatus}
                        onValueChange={(v: string | null) =>
                          v && updateRow(row.id, "employmentStatus", v as HCRow["employmentStatus"])
                        }
                      >
                        <SelectTrigger className="h-8 border-0 bg-transparent shadow-none">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded px-2 py-1.5 text-sm text-center bg-transparent focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, "quantity", Number(e.target.value))}
                      />
                    </td>
                    <td className="border px-2 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove row"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="bg-muted/40 font-semibold">
                    <td className="border px-3 py-2" colSpan={2}>Total</td>
                    <td className="border px-3 py-2 text-center">{grandTotal}</td>
                    <td className="border px-3 py-2" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add shortcut row */}
          {rows.length > 0 && (
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Input
                placeholder="Quick-add: position name…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    update([
                      ...rows,
                      {
                        id: generateId(),
                        position: e.currentTarget.value.trim(),
                        employmentStatus: "",
                        quantity: 1,
                      },
                    ]);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/b`} />}>
          ← Enterprise Architecture
        </Button>
        <Button nativeButton={false} render={<a href={`/dashboard/documents/${docId}/part3/d`} />}>
          Next: Proposed IS →
        </Button>
      </div>
    </div>
  );
}
