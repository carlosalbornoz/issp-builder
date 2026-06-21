"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHILIPPINE_REGIONS, type OfficeType, type PhilippineRegionCode } from "@/lib/annex1/types";

export default function Annex1SetupPage() {
  const router = useRouter();
  const [officeType, setOfficeType] = useState<OfficeType | null>(null);
  const [region, setRegion] = useState<PhilippineRegionCode | "">("");
  const [fieldName, setFieldName] = useState("");

  const canContinue =
    officeType === "central" ||
    (officeType === "regional" && region !== "") ||
    (officeType === "field" && region !== "" && fieldName.trim() !== "");

  function handleContinue() {
    if (!officeType || !canContinue) return;
    const params = new URLSearchParams({ type: officeType });
    if (region) params.set("region", region);
    if (officeType === "field" && fieldName.trim()) params.set("name", fieldName.trim());
    router.push(`/annex1/edit?${params.toString()}`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-display)] mb-2">
          Who is filling out this form?
        </h1>
        <p className="text-sm text-muted-foreground">
          Each office fills in their own inventory and sends the file to the CIO, who consolidates before the final PDF export.
        </p>
      </div>

      {/* Office type selection */}
      <div className="space-y-3 mb-6">
        {(
          [
            { type: "central" as const, label: "Central Office", icon: Building2, desc: "The main/head office of the agency" },
            { type: "regional" as const, label: "Regional Office", icon: MapPin, desc: "A regional office under the agency" },
            { type: "field" as const, label: "Field Office", icon: Building, desc: "A field or satellite office under a regional office" },
          ] as const
        ).map(({ type, label, icon: Icon, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => { setOfficeType(type); setRegion(""); setFieldName(""); }}
            className={cn(
              "w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
              officeType === type
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 hover:bg-accent/40"
            )}
          >
            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", officeType === type ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className={cn("text-sm font-semibold", officeType === type ? "text-primary" : "text-foreground")}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Region dropdown — regional & field offices */}
      {(officeType === "regional" || officeType === "field") && (
        <div className="mb-4 space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {officeType === "regional" ? "Region" : "Parent Region"}
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as PhilippineRegionCode)}
            className={cn(
              "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              !region && "text-muted-foreground"
            )}
          >
            <option value="" disabled>Select region…</option>
            {PHILIPPINE_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Field office name */}
      {officeType === "field" && (
        <div className="mb-4 space-y-1.5">
          <label className="text-sm font-medium text-foreground">Office Name</label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="e.g. UP Diliman Field Office"
            className={cn(
              "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
            )}
          />
        </div>
      )}

      <Button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full"
      >
        Continue →
      </Button>
    </div>
  );
}
