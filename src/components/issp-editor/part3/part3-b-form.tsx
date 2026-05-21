"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaveStatusIndicator } from "@/components/issp-editor/save-status-indicator";
import { LayoutDashboard, Upload } from "lucide-react";

// Enterprise Architecture is mostly a diagram upload + guidance.
// We handle the diagram path display only; actual upload would need file handling.

export function Part3BForm({
  initialDiagramDataUrl,
}: {
  initialDiagramDataUrl: string | null;
}) {
  const router = useRouter();
  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 flex items-start justify-between -mx-4 px-4 py-4 md:-mx-8 md:px-8 md:py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mt-4 md:-mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Part III · Section B
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Architecture</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Provide the agency&apos;s target Enterprise Architecture (EA) framework and diagram.
          </p>
        </div>
        <SaveStatusIndicator status="saved" />
      </div>

      {/* Guidance */}
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <LayoutDashboard className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-green-800">
            <p className="font-semibold mb-1">What to include</p>
            <ul className="text-xs text-green-700 list-disc list-inside space-y-1">
              <li>
                <strong>Business Architecture</strong> — How ICT supports organizational outcomes
              </li>
              <li>
                <strong>Application Architecture</strong> — The portfolio of information systems and their relationships
              </li>
              <li>
                <strong>Technology Architecture</strong> — Platforms, infrastructure, standards
              </li>
              <li>
                <strong>Data Architecture</strong> — Data flows, master data management, interoperability
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Attach the EA diagram as a separate file in the final ISSP document. Reference the{" "}
              <strong>Philippine EA Framework (PeGov)</strong> if applicable.
            </p>
          </div>
        </div>
      </div>

      {/* Diagram upload placeholder */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">EA Diagram</CardTitle>
          <CardDescription>
            Attach or reference the enterprise architecture diagram for this ISSP period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 py-12 text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            {initialDiagramDataUrl ? (
              <div className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={initialDiagramDataUrl} alt="Enterprise Architecture Diagram" className="w-full max-h-[480px] object-contain" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  No diagram attached yet
                </p>
                <p className="text-xs text-muted-foreground">
                  File upload will be available in a future update.
                  <br />
                  Attach the EA diagram as an annex in your final document.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => router.push("/editor/part3/a")}>
          ← Proposed Infrastructure
        </Button>
        <Button onClick={() => router.push("/editor/part3/c")}>
          Next: Proposed Human Capital →
        </Button>
      </div>
    </div>
  );
}
