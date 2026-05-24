"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { SectionShell } from "@/components/editor/section-shell";

interface Stakeholder {
  id: string;
  name: string;
  transactions: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
}

interface Part1CFormProps {
  initialData: Stakeholder[];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const COMPLEXITY_OPTIONS = [
  { value: "Simple", label: "Simple" },
  { value: "Complex", label: "Complex" },
  { value: "Highly Technical", label: "Highly Technical" },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  Simple: "bg-green-100 text-green-800",
  Complex: "bg-amber-100 text-amber-800",
  "Highly Technical": "bg-red-100 text-red-800",
};

export function Part1CForm({ initialData }: Part1CFormProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(() => {
    return initialData.map((s) => ({
      ...s,
      id: s.id || crypto.randomUUID(),
    }));
  });

  const { debouncedSave } = useLocalSave("part1", "part1/c");

  const update = useCallback(
    (next: Stakeholder[]) => {
      setStakeholders(next);
      debouncedSave({ stakeholders: next });
    },
    [debouncedSave]
  );

  function addStakeholder() {
    const newS: Stakeholder = {
      id: generateId(),
      name: "",
      transactions: "",
      complexity: "Simple",
    };
    update([...stakeholders, newS]);
  }

  function removeStakeholder(id: string) {
    update(stakeholders.filter((s) => s.id !== id));
  }

  function updateStakeholder(id: string, field: keyof Stakeholder, value: string) {
    update(
      stakeholders.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  }

  return (
    <SectionShell
      sectionId="part1/c"
      title="Stakeholder Analysis"
      description="List the key stakeholders of your agency and the transactions/services they use."
    >

      {/* Guide */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Guidelines</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
          <li>List all external stakeholders (citizens, businesses, other agencies).</li>
          <li>Describe the transactions or services each stakeholder uses.</li>
          <li>Rate the complexity: <strong>Simple</strong> (routine), <strong>Complex</strong> (multi-step), or <strong>Highly Technical</strong> (specialized expertise required).</li>
        </ul>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stakeholders</CardTitle>
              <CardDescription className="mt-1">
                {stakeholders.length} stakeholder{stakeholders.length !== 1 ? "s" : ""} added
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addStakeholder} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Stakeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-3 py-2 w-8" />
                  <th className="border px-3 py-2 text-left font-semibold">
                    Stakeholder / Client
                  </th>
                  <th className="border px-3 py-2 text-left font-semibold">
                    Transactions / Services
                  </th>
                  <th className="border px-3 py-2 text-left font-semibold w-44">
                    Complexity
                  </th>
                  <th className="border px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {stakeholders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border px-3 py-8 text-center text-muted-foreground text-sm">
                      No stakeholders added yet.{" "}
                      <button
                        type="button"
                        onClick={addStakeholder}
                        className="font-medium text-primary hover:underline"
                      >
                        Add the first one.
                      </button>
                    </td>
                  </tr>
                )}
                {stakeholders.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="border px-2 py-2 text-center">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder={`Stakeholder ${idx + 1}`}
                        value={s.name}
                        onChange={(e) => updateStakeholder(s.id, "name", e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Describe transactions..."
                        value={s.transactions}
                        onChange={(e) => updateStakeholder(s.id, "transactions", e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <Select
                        items={COMPLEXITY_OPTIONS}
                        value={s.complexity}
                        onValueChange={(v: string | null) => v && updateStakeholder(s.id, "complexity", v)}
                      >
                        <SelectTrigger className="h-8 border-0 bg-card/70 shadow-none hover:bg-card focus:ring-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLEXITY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[o.value]}`}
                              >
                                {o.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove stakeholder"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStakeholder(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {stakeholders.length === 0 && (
              <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No stakeholders yet.{" "}
                  <button type="button" onClick={addStakeholder} className="font-medium text-primary hover:underline">
                    Add one.
                  </button>
                </p>
              </div>
            )}
            {stakeholders.map((s, idx) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Stakeholder {idx + 1}</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove stakeholder"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStakeholder(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stakeholder / Client</Label>
                  <Input
                    placeholder="e.g., Citizens, Businesses"
                    value={s.name}
                    onChange={(e) => updateStakeholder(s.id, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Transactions / Services</Label>
                  <Input
                    placeholder="Describe transactions..."
                    value={s.transactions}
                    onChange={(e) => updateStakeholder(s.id, "transactions", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Complexity</Label>
                  <Select
                    items={COMPLEXITY_OPTIONS}
                    value={s.complexity}
                    onValueChange={(v: string | null) => v && updateStakeholder(s.id, "complexity", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLEXITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </SectionShell>
  );
}
