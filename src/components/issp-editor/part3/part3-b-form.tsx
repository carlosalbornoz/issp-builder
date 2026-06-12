"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { SectionShell } from "@/components/editor/section-shell";
import { useLocalSave } from "@/hooks/use-local-save";
import { DiagramUploadField } from "@/components/issp-editor/diagram-upload-field";

export function Part3BForm({
  initialDiagramDataUrl,
}: {
  initialDiagramDataUrl: string | null;
}) {
  const [diagramDataUrl, setDiagramDataUrl] = useState(initialDiagramDataUrl);
  const { debouncedSave } = useLocalSave("part3", "part3/b");

  function handleDiagramChange(dataUrl: string | null) {
    setDiagramDataUrl(dataUrl);
    debouncedSave({ enterpriseArchDataUrl: dataUrl });
  }

  return (
    <SectionShell
      sectionId="part3/b"
      title="Enterprise Architecture"
      description="Provide the agency's target Enterprise Architecture (EA) framework and diagram."
    >
      {/* Guidance */}
      <div className="rounded-lg border border-success-border bg-success-bg p-4 text-sm">
        <div className="flex items-start gap-3">
          <LayoutDashboard className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div className="text-success">
            <p className="font-semibold mb-1">What to include</p>
            <ul className="text-xs text-success list-disc list-inside space-y-1">
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
              Upload the EA diagram below; it will be embedded in the exported PDF. Reference the{" "}
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
          <DiagramUploadField
            value={diagramDataUrl}
            onChange={handleDiagramChange}
            title="Enterprise Architecture Diagram"
            emptyTitle="Click to upload an EA diagram"
            emptyDescription="PNG, JPG, WebP, or SVG - max 10 MB"
            alt="Enterprise Architecture diagram"
          />
        </CardContent>
      </Card>
    </SectionShell>
  );
}
