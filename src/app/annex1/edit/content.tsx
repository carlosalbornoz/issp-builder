"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, ArrowLeft, LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EquipmentTable,
  EquipmentCards,
  SoftwareTable,
  SoftwareCards,
} from "@/components/annex1/inventory-table";
import {
  defaultEquipmentRows,
  defaultSoftwareRows,
  buildDisplayLabel,
  type EquipmentRow,
  type SoftwareRow,
  type OfficeType,
  type PhilippineRegionCode,
  type Annex1FilePayload,
} from "@/lib/annex1/types";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "card";

export function Annex1EditContent() {
  const router = useRouter();
  const params = useSearchParams();

  const officeType = (params.get("type") ?? "central") as OfficeType;
  const region = (params.get("region") ?? undefined) as PhilippineRegionCode | undefined;
  const fieldName = params.get("name") ?? "";

  const displayLabel = buildDisplayLabel(officeType, region, fieldName);

  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(defaultEquipmentRows);
  const [softwareRows, setSoftwareRows]   = useState<SoftwareRow[]>(defaultSoftwareRows);
  const [downloading, setDownloading]     = useState(false);
  const [viewMode, setViewMode]           = useState<ViewMode>("table");

  if (!params.get("type")) {
    router.replace("/annex1");
    return null;
  }

  function buildFilename(): string {
    const part =
      officeType === "central"   ? "CO" :
      officeType === "regional"  ? `RO-${region ?? "XX"}` :
                                   `FO-${(region ?? "XX")}-${fieldName.replace(/\s+/g, "-").toUpperCase()}`;
    return `ANNEX1-${part}-${new Date().getFullYear()}.issp`;
  }

  function handleDownload() {
    setDownloading(true);

    const payload: Annex1FilePayload = {
      version: "1.0",
      fileType: "annex1",
      exportedAt: new Date().toISOString(),
      tool: "issp-platform",
      office: {
        type: officeType,
        region,
        name: officeType === "central"  ? "Central Office"
            : officeType === "regional" ? `Regional Office — ${region}`
            : fieldName,
        displayLabel,
      },
      annex1: { equipment: equipmentRows, software: softwareRows },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = buildFilename();
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" />
            Change office
          </button>
          <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-display)]">
            ICT Asset Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Filling for: <span className="font-medium text-foreground">{displayLabel}</span>
          </p>
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2 shrink-0"
        >
          <Download className="h-4 w-4" />
          Download .issp
        </Button>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Fill in counts for each resource. Leave unused rows at zero.
        </p>
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "table"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "card"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      {/* Equipment */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">1. ICT Equipment Inventory</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Count units by status. Fill only the rows relevant to your office — leave others at zero.
          </p>
        </div>
        {viewMode === "table"
          ? <EquipmentTable rows={equipmentRows} onChange={setEquipmentRows} />
          : <EquipmentCards rows={equipmentRows} onChange={setEquipmentRows} />
        }
      </section>

      {/* Software */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">2. ICT Software Inventory</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Count licenses by type. Perpetual = one-time purchase. Subscription = recurring.
          </p>
        </div>
        {viewMode === "table"
          ? <SoftwareTable rows={softwareRows} onChange={setSoftwareRows} />
          : <SoftwareCards rows={softwareRows} onChange={setSoftwareRows} />
        }
      </section>

      {/* Bottom download CTA */}
      <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Send this .issp file to your CIO. They will attach it to the main ISSP document before exporting the final PDF.
        </p>
        <Button type="button" onClick={handleDownload} disabled={downloading} className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Download .issp file
        </Button>
      </div>
    </div>
  );
}
