"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EquipmentRow, SoftwareRow } from "@/lib/annex1/types";

// ─── Shared cell input ────────────────────────────────────────────────────────

function NumCell({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <td className="border border-border px-2 py-1.5 text-center text-sm font-medium text-muted-foreground bg-muted/30 tabular-nums">
        {value}
      </td>
    );
  }
  return (
    <td className="border border-border p-0">
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange?.(isNaN(n) ? 0 : Math.max(0, n));
        }}
        className={cn(
          "w-full h-full min-h-[2.25rem] px-2 py-1.5 text-center text-sm tabular-nums",
          "bg-transparent focus:outline-none focus:bg-accent/50",
          "placeholder:text-muted-foreground/40"
        )}
      />
    </td>
  );
}

// ─── Equipment table ──────────────────────────────────────────────────────────

export function EquipmentTable({
  rows,
  onChange,
}: {
  rows: EquipmentRow[];
  onChange: (rows: EquipmentRow[]) => void;
}) {
  function updateRow(id: string, side: "centralOffice" | "fieldOffice", key: keyof EquipmentRow["centralOffice"], value: number) {
    onChange(rows.map((r) => r.id !== id ? r : { ...r, [side]: { ...r[side], [key]: value } }));
  }

  function updateLabel(id: string, type: string) {
    onChange(rows.map((r) => r.id !== id ? r : { ...r, type }));
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addRow() {
    onChange([...rows, {
      id: crypto.randomUUID(),
      type: "",
      isCustom: true,
      centralOffice: { operational: 0, endOfLife: 0, backup: 0 },
      fieldOffice: { operational: 0, endOfLife: 0, backup: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-semibold w-40 min-w-[10rem]">ICT Resources</th>
              <th className="border border-border px-3 py-2 text-left font-semibold w-44">Office Location</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-24">Operational</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-24">End of Life</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-20">Backup</th>
              <th className="border border-border px-1 py-2 w-8" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const coTotal = row.centralOffice.operational + row.centralOffice.endOfLife + row.centralOffice.backup;
              const foTotal = row.fieldOffice.operational + row.fieldOffice.endOfLife + row.fieldOffice.backup;
              const totOp  = row.centralOffice.operational + row.fieldOffice.operational;
              const totEol = row.centralOffice.endOfLife + row.fieldOffice.endOfLife;
              const totBk  = row.centralOffice.backup + row.fieldOffice.backup;
              void coTotal; void foTotal;

              return (
                <>
                  {/* Central Office row */}
                  <tr key={`${row.id}-co`} className="hover:bg-accent/20">
                    <td rowSpan={3} className="border border-border px-3 py-2 align-middle font-medium leading-tight">
                      {row.isCustom ? (
                        <input
                          type="text"
                          value={row.type}
                          placeholder="Item name…"
                          onChange={(e) => updateLabel(row.id, e.target.value)}
                          className="w-full bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                        />
                      ) : (
                        row.type
                      )}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Central Office</td>
                    <NumCell value={row.centralOffice.operational} onChange={(v) => updateRow(row.id, "centralOffice", "operational", v)} />
                    <NumCell value={row.centralOffice.endOfLife}   onChange={(v) => updateRow(row.id, "centralOffice", "endOfLife",   v)} />
                    <NumCell value={row.centralOffice.backup}      onChange={(v) => updateRow(row.id, "centralOffice", "backup",      v)} />
                    <td rowSpan={3} className="border border-border p-0 text-center align-middle">
                      {row.isCustom && (
                        <button
                          type="button"
                          aria-label={`Remove ${row.type || "item"}`}
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Field/Regional Office row */}
                  <tr key={`${row.id}-fo`} className="hover:bg-accent/20">
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Field/Regional Office</td>
                    <NumCell value={row.fieldOffice.operational} onChange={(v) => updateRow(row.id, "fieldOffice", "operational", v)} />
                    <NumCell value={row.fieldOffice.endOfLife}   onChange={(v) => updateRow(row.id, "fieldOffice", "endOfLife",   v)} />
                    <NumCell value={row.fieldOffice.backup}      onChange={(v) => updateRow(row.id, "fieldOffice", "backup",      v)} />
                  </tr>

                  {/* Total row */}
                  <tr key={`${row.id}-total`} className="bg-muted/20">
                    <td className="border border-border px-3 py-1.5 text-xs text-muted-foreground font-medium">Total</td>
                    <NumCell value={totOp}  readOnly />
                    <NumCell value={totEol} readOnly />
                    <NumCell value={totBk}  readOnly />
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}

// ─── Software table ───────────────────────────────────────────────────────────

export function SoftwareTable({
  rows,
  onChange,
}: {
  rows: SoftwareRow[];
  onChange: (rows: SoftwareRow[]) => void;
}) {
  function updateRow(id: string, side: "centralOffice" | "fieldOffice", key: keyof SoftwareRow["centralOffice"], value: number) {
    onChange(rows.map((r) => r.id !== id ? r : { ...r, [side]: { ...r[side], [key]: value } }));
  }

  function updateLabel(id: string, type: string) {
    onChange(rows.map((r) => r.id !== id ? r : { ...r, type }));
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addRow() {
    onChange([...rows, {
      id: crypto.randomUUID(),
      type: "",
      isCustom: true,
      centralOffice: { perpetual: 0, subscription: 0 },
      fieldOffice: { perpetual: 0, subscription: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-semibold w-56 min-w-[14rem]">ICT Resources</th>
              <th className="border border-border px-3 py-2 text-left font-semibold w-44">Office Location</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-28">Perpetual</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-28">Subscription</th>
              <th className="border border-border px-1 py-2 w-8" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totPerp = row.centralOffice.perpetual + row.fieldOffice.perpetual;
              const totSub  = row.centralOffice.subscription + row.fieldOffice.subscription;

              return (
                <>
                  <tr key={`${row.id}-co`} className="hover:bg-accent/20">
                    <td rowSpan={3} className="border border-border px-3 py-2 align-middle font-medium leading-tight">
                      {row.isCustom ? (
                        <input
                          type="text"
                          value={row.type}
                          placeholder="Item name…"
                          onChange={(e) => updateLabel(row.id, e.target.value)}
                          className="w-full bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                        />
                      ) : (
                        row.type
                      )}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Central Office</td>
                    <NumCell value={row.centralOffice.perpetual}    onChange={(v) => updateRow(row.id, "centralOffice", "perpetual",    v)} />
                    <NumCell value={row.centralOffice.subscription} onChange={(v) => updateRow(row.id, "centralOffice", "subscription", v)} />
                    <td rowSpan={3} className="border border-border p-0 text-center align-middle">
                      {row.isCustom && (
                        <button
                          type="button"
                          aria-label={`Remove ${row.type || "item"}`}
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>

                  <tr key={`${row.id}-fo`} className="hover:bg-accent/20">
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Field/Regional Office</td>
                    <NumCell value={row.fieldOffice.perpetual}    onChange={(v) => updateRow(row.id, "fieldOffice", "perpetual",    v)} />
                    <NumCell value={row.fieldOffice.subscription} onChange={(v) => updateRow(row.id, "fieldOffice", "subscription", v)} />
                  </tr>

                  <tr key={`${row.id}-total`} className="bg-muted/20">
                    <td className="border border-border px-3 py-1.5 text-xs text-muted-foreground font-medium">Total</td>
                    <NumCell value={totPerp} readOnly />
                    <NumCell value={totSub}  readOnly />
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}
