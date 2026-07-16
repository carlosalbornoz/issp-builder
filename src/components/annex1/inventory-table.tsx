"use client";

import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EquipmentRow, SoftwareRow } from "@/lib/annex1/types";

// ─── Shared: table numeric cell ───────────────────────────────────────────────

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

// ─── Shared: card numeric field ───────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(isNaN(n) ? 0 : Math.max(0, n));
        }}
        className={cn(
          "w-14 text-center text-sm tabular-nums",
          "rounded border border-border px-2 py-1.5 bg-background",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "placeholder:text-muted-foreground/40"
        )}
      />
    </div>
  );
}

// ─── Equipment — Table ────────────────────────────────────────────────────────

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
      id: crypto.randomUUID(), type: "", isCustom: true,
      centralOffice: { operational: 0, endOfLife: 0, backup: 0 },
      fieldOffice:   { operational: 0, endOfLife: 0, backup: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-semibold w-44 min-w-[11rem]">ICT Resource</th>
              <th className="border border-border px-3 py-2 text-left font-semibold w-40">Office</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-24">Operational</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-24">End of Life</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-20">Backup</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totOp  = row.centralOffice.operational + row.fieldOffice.operational;
              const totEol = row.centralOffice.endOfLife   + row.fieldOffice.endOfLife;
              const totBk  = row.centralOffice.backup      + row.fieldOffice.backup;

              return (
                <Fragment key={row.id}>
                  {/* Central Office */}
                  <tr className="hover:bg-accent/20">
                    <td rowSpan={2} className="border border-border px-3 py-2 align-middle leading-tight">
                      {row.isCustom ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.type}
                            placeholder="Item name…"
                            onChange={(e) => updateLabel(row.id, e.target.value)}
                            className="flex-1 min-w-0 bg-transparent focus:outline-none font-medium placeholder:text-muted-foreground/40 placeholder:font-normal"
                          />
                          <button
                            type="button"
                            aria-label={`Remove ${row.type || "item"}`}
                            onClick={() => removeRow(row.id)}
                            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">{row.type}</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Central Office</td>
                    <NumCell value={row.centralOffice.operational} onChange={(v) => updateRow(row.id, "centralOffice", "operational", v)} />
                    <NumCell value={row.centralOffice.endOfLife}   onChange={(v) => updateRow(row.id, "centralOffice", "endOfLife",   v)} />
                    <NumCell value={row.centralOffice.backup}      onChange={(v) => updateRow(row.id, "centralOffice", "backup",      v)} />
                  </tr>

                  {/* Field/Regional Office */}
                  <tr className="hover:bg-accent/20">
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Field/Regional Office</td>
                    <NumCell value={row.fieldOffice.operational} onChange={(v) => updateRow(row.id, "fieldOffice", "operational", v)} />
                    <NumCell value={row.fieldOffice.endOfLife}   onChange={(v) => updateRow(row.id, "fieldOffice", "endOfLife",   v)} />
                    <NumCell value={row.fieldOffice.backup}      onChange={(v) => updateRow(row.id, "fieldOffice", "backup",      v)} />
                  </tr>

                  {/* Total — "Total" in col 1 (ICT Resources), Office Location empty, per DICT template */}
                  <tr className="bg-muted/20 font-bold">
                    <td className="border border-border px-3 py-1.5 text-sm font-bold">Total</td>
                    <td className="border border-border" />
                    <NumCell value={totOp}  readOnly />
                    <NumCell value={totEol} readOnly />
                    <NumCell value={totBk}  readOnly />
                  </tr>
                </Fragment>
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

// ─── Equipment — Cards ────────────────────────────────────────────────────────

function EquipmentCard({
  row,
  onUpdate,
  onUpdateLabel,
  onRemove,
}: {
  row: EquipmentRow;
  onUpdate: (side: "centralOffice" | "fieldOffice", key: keyof EquipmentRow["centralOffice"], value: number) => void;
  onUpdateLabel: (type: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        {row.isCustom ? (
          <input
            type="text"
            value={row.type}
            placeholder="Item name…"
            onChange={(e) => onUpdateLabel(e.target.value)}
            className="flex-1 text-sm font-semibold bg-transparent focus:outline-none border-b border-border/60 pb-0.5 placeholder:text-muted-foreground/40 placeholder:font-normal"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">{row.type}</span>
        )}
        {row.isCustom && (
          <button
            type="button"
            aria-label={`Remove ${row.type || "item"}`}
            onClick={onRemove}
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Two-column inputs */}
      <div className="grid grid-cols-2 divide-x divide-border gap-0">
        <div className="space-y-2.5 pr-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Central Office</p>
          <NumField label="Operational" value={row.centralOffice.operational} onChange={(v) => onUpdate("centralOffice", "operational", v)} />
          <NumField label="End of Life" value={row.centralOffice.endOfLife}   onChange={(v) => onUpdate("centralOffice", "endOfLife",   v)} />
          <NumField label="Backup"      value={row.centralOffice.backup}      onChange={(v) => onUpdate("centralOffice", "backup",      v)} />
        </div>
        <div className="space-y-2.5 pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Field/Regional Office</p>
          <NumField label="Operational" value={row.fieldOffice.operational} onChange={(v) => onUpdate("fieldOffice", "operational", v)} />
          <NumField label="End of Life" value={row.fieldOffice.endOfLife}   onChange={(v) => onUpdate("fieldOffice", "endOfLife",   v)} />
          <NumField label="Backup"      value={row.fieldOffice.backup}      onChange={(v) => onUpdate("fieldOffice", "backup",      v)} />
        </div>
      </div>
    </div>
  );
}

export function EquipmentCards({
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
      id: crypto.randomUUID(), type: "", isCustom: true,
      centralOffice: { operational: 0, endOfLife: 0, backup: 0 },
      fieldOffice:   { operational: 0, endOfLife: 0, backup: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => (
          <EquipmentCard
            key={row.id}
            row={row}
            onUpdate={(side, key, v) => updateRow(row.id, side, key, v)}
            onUpdateLabel={(type) => updateLabel(row.id, type)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}

// ─── Software — Table ─────────────────────────────────────────────────────────

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
      id: crypto.randomUUID(), type: "", isCustom: true,
      centralOffice: { perpetual: 0, subscription: 0 },
      fieldOffice:   { perpetual: 0, subscription: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-semibold w-56 min-w-[14rem]">ICT Resource</th>
              <th className="border border-border px-3 py-2 text-left font-semibold w-40">Office</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-28">Perpetual</th>
              <th className="border border-border px-3 py-2 text-center font-semibold w-28">Subscription</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totPerp = row.centralOffice.perpetual    + row.fieldOffice.perpetual;
              const totSub  = row.centralOffice.subscription + row.fieldOffice.subscription;

              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-accent/20">
                    <td rowSpan={2} className="border border-border px-3 py-2 align-middle leading-tight">
                      {row.isCustom ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.type}
                            placeholder="Item name…"
                            onChange={(e) => updateLabel(row.id, e.target.value)}
                            className="flex-1 min-w-0 bg-transparent focus:outline-none font-medium placeholder:text-muted-foreground/40 placeholder:font-normal"
                          />
                          <button
                            type="button"
                            aria-label={`Remove ${row.type || "item"}`}
                            onClick={() => removeRow(row.id)}
                            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">{row.type}</span>
                      )}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Central Office</td>
                    <NumCell value={row.centralOffice.perpetual}    onChange={(v) => updateRow(row.id, "centralOffice", "perpetual",    v)} />
                    <NumCell value={row.centralOffice.subscription} onChange={(v) => updateRow(row.id, "centralOffice", "subscription", v)} />
                  </tr>

                  <tr className="hover:bg-accent/20">
                    <td className="border border-border px-3 py-1.5 text-sm text-muted-foreground">Field/Regional Office</td>
                    <NumCell value={row.fieldOffice.perpetual}    onChange={(v) => updateRow(row.id, "fieldOffice", "perpetual",    v)} />
                    <NumCell value={row.fieldOffice.subscription} onChange={(v) => updateRow(row.id, "fieldOffice", "subscription", v)} />
                  </tr>

                  {/* Total — "Total" in col 1 (ICT Resources), Office Location empty, per DICT template */}
                  <tr className="bg-muted/20 font-bold">
                    <td className="border border-border px-3 py-1.5 text-sm font-bold">Total</td>
                    <td className="border border-border" />
                    <NumCell value={totPerp} readOnly />
                    <NumCell value={totSub}  readOnly />
                  </tr>
                </Fragment>
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

// ─── Software — Cards ─────────────────────────────────────────────────────────

function SoftwareCard({
  row,
  onUpdate,
  onUpdateLabel,
  onRemove,
}: {
  row: SoftwareRow;
  onUpdate: (side: "centralOffice" | "fieldOffice", key: keyof SoftwareRow["centralOffice"], value: number) => void;
  onUpdateLabel: (type: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        {row.isCustom ? (
          <input
            type="text"
            value={row.type}
            placeholder="Item name…"
            onChange={(e) => onUpdateLabel(e.target.value)}
            className="flex-1 text-sm font-semibold bg-transparent focus:outline-none border-b border-border/60 pb-0.5 placeholder:text-muted-foreground/40 placeholder:font-normal"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">{row.type}</span>
        )}
        {row.isCustom && (
          <button
            type="button"
            aria-label={`Remove ${row.type || "item"}`}
            onClick={onRemove}
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="space-y-2.5 pr-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Central Office</p>
          <NumField label="Perpetual"    value={row.centralOffice.perpetual}    onChange={(v) => onUpdate("centralOffice", "perpetual",    v)} />
          <NumField label="Subscription" value={row.centralOffice.subscription} onChange={(v) => onUpdate("centralOffice", "subscription", v)} />
        </div>
        <div className="space-y-2.5 pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Field/Regional Office</p>
          <NumField label="Perpetual"    value={row.fieldOffice.perpetual}    onChange={(v) => onUpdate("fieldOffice", "perpetual",    v)} />
          <NumField label="Subscription" value={row.fieldOffice.subscription} onChange={(v) => onUpdate("fieldOffice", "subscription", v)} />
        </div>
      </div>
    </div>
  );
}

export function SoftwareCards({
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
      id: crypto.randomUUID(), type: "", isCustom: true,
      centralOffice: { perpetual: 0, subscription: 0 },
      fieldOffice:   { perpetual: 0, subscription: 0 },
    }]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => (
          <SoftwareCard
            key={row.id}
            row={row}
            onUpdate={(side, key, v) => updateRow(row.id, side, key, v)}
            onUpdateLabel={(type) => updateLabel(row.id, type)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}
