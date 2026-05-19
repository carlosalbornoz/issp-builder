"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types (mirrored from part4-year-form for import convenience) ─────────────

export interface SummaryRow {
  label: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
  isTotal?: boolean;
}

export interface UacsRow {
  uacsCode: string;
  uacsLabel: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
}

export interface Part4SummaryData {
  yearLabels: [string, string, string];
  b1: SummaryRow[];           // General Summary — category × year
  b2: SummaryRow[];           // By Fund Source
  b3: SummaryRow[];           // Statement of Expenditure (CO / MOOE)
  b4: UacsRow[];              // Object of Expenditure by UACS
  grandTotals: [number, number, number]; // per year, should match across B.1–B.3
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function php(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);
}

// ─── Summary Table ─────────────────────────────────────────────────────────────

function SummaryTable({
  title,
  subtitle,
  rows,
  yearLabels,
}: {
  title: string;
  subtitle: string;
  rows: SummaryRow[];
  yearLabels: [string, string, string];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2.5 font-medium w-1/3">Category</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[0]}</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[1]}</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[2]}</th>
              <th className="text-right px-4 py-2.5 font-medium bg-primary/5">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b last:border-0",
                  row.isTotal
                    ? "bg-muted/30 font-semibold"
                    : "hover:bg-muted/20"
                )}
              >
                <td className="px-4 py-2.5">{row.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.year1 > 0 || row.isTotal ? php(row.year1) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.year2 > 0 || row.isTotal ? php(row.year2) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.year3 > 0 || row.isTotal ? php(row.year3) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className={cn("px-4 py-2.5 text-right tabular-nums", row.isTotal ? "bg-primary/5" : "bg-muted/10")}>
                  {php(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── UACS Table ────────────────────────────────────────────────────────────────

function UacsTable({
  rows,
  yearLabels,
}: {
  rows: UacsRow[];
  yearLabels: [string, string, string];
}) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const y1 = rows.reduce((s, r) => s + r.year1, 0);
  const y2 = rows.reduce((s, r) => s + r.year2, 0);
  const y3 = rows.reduce((s, r) => s + r.year3, 0);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">B.4 Object of Expenditure</h2>
        <p className="text-xs text-muted-foreground">Costs mapped to UACS codes across all projects and years</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2.5 font-medium w-28">UACS Code</th>
              <th className="text-left px-4 py-2.5 font-medium">Description</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[0]}</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[1]}</th>
              <th className="text-right px-4 py-2.5 font-medium">{yearLabels[2]}</th>
              <th className="text-right px-4 py-2.5 font-medium bg-primary/5">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                  No line items with UACS codes found. Add items in the Year 1–3 breakdowns.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.uacsCode} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs">{row.uacsCode}</td>
                  <td className="px-4 py-2.5">{row.uacsLabel || row.uacsCode}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.year1 > 0 ? php(row.year1) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.year2 > 0 ? php(row.year2) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.year3 > 0 ? php(row.year3) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums bg-muted/10">{php(row.total)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 font-semibold border-t">
                <td className="px-4 py-2.5" colSpan={2}>Grand Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{php(y1)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{php(y2)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{php(y3)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums bg-primary/5">{php(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Consistency Banner ────────────────────────────────────────────────────────

function ConsistencyBanner({
  b1Totals,
  b2Totals,
  b3Totals,
  yearLabels,
}: {
  b1Totals: [number, number, number];
  b2Totals: [number, number, number];
  b3Totals: [number, number, number];
  yearLabels: [string, string, string];
}) {
  const consistent = b1Totals.every(
    (v, i) => Math.abs(v - b2Totals[i]) < 0.01 && Math.abs(v - b3Totals[i]) < 0.01
  );

  if (consistent && b1Totals.every((v) => v === 0)) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        consistent
          ? "border-green-200 bg-green-50/50 text-green-800"
          : "border-amber-200 bg-amber-50/50 text-amber-800"
      )}
    >
      {consistent ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      )}
      <div>
        {consistent ? (
          <p className="font-medium">All totals are consistent across B.1, B.2, and B.3.</p>
        ) : (
          <>
            <p className="font-medium">Totals are inconsistent — check your line items.</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {b1Totals.map((v, i) => {
                const ok = Math.abs(v - b2Totals[i]) < 0.01 && Math.abs(v - b3Totals[i]) < 0.01;
                if (ok) return null;
                return (
                  <li key={i}>
                    {yearLabels[i]}: B.1={php(v)} · B.2={php(b2Totals[i])} · B.3={php(b3Totals[i])}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function Part4Summary({
  data,
}: {
  data: Part4SummaryData;
}) {
  const b1TotalsRow = data.b1.find((r) => r.isTotal);
  const b2TotalsRow = data.b2.find((r) => r.isTotal);
  const b3TotalsRow = data.b3.find((r) => r.isTotal);

  const b1Totals: [number, number, number] = [
    b1TotalsRow?.year1 ?? 0,
    b1TotalsRow?.year2 ?? 0,
    b1TotalsRow?.year3 ?? 0,
  ];
  const b2Totals: [number, number, number] = [
    b2TotalsRow?.year1 ?? 0,
    b2TotalsRow?.year2 ?? 0,
    b2TotalsRow?.year3 ?? 0,
  ];
  const b3Totals: [number, number, number] = [
    b3TotalsRow?.year1 ?? 0,
    b3TotalsRow?.year2 ?? 0,
    b3TotalsRow?.year3 ?? 0,
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-1">
            Part IV · Summary
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Summary of Investments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-calculated totals from Year 1–3 breakdowns. All four tables must share the same grand total.
          </p>
        </div>
      </div>

      <ConsistencyBanner
        b1Totals={b1Totals}
        b2Totals={b2Totals}
        b3Totals={b3Totals}
        yearLabels={data.yearLabels}
      />

      <SummaryTable
        title="B.1 General Summary"
        subtitle="Total ICT investments grouped by functional category"
        rows={data.b1}
        yearLabels={data.yearLabels}
      />

      <SummaryTable
        title="B.2 By Fund Source"
        subtitle="Total investments grouped by financial origin"
        rows={data.b2}
        yearLabels={data.yearLabels}
      />

      <SummaryTable
        title="B.3 Statement of Expenditure"
        subtitle="Budget classified by nature of expense per DBM guidelines"
        rows={data.b3}
        yearLabels={data.yearLabels}
      />

      <UacsTable rows={data.b4} yearLabels={data.yearLabels} />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<Link href="/editor/part4/year3" />}>
          ← Year 3 Breakdown
        </Button>
        <Button nativeButton={false} render={<Link href="/editor" />}>
          Back to Overview →
        </Button>
      </div>
    </div>
  );
}
