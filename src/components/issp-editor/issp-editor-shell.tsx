"use client";

import { useState } from "react";
import { IsspSidebar } from "./issp-sidebar";

interface DocInfo {
  id: string;
  title: string;
  startYear: number;
  endYear: number;
  status: string;
  amendmentNumber: number;
  scope: string;
  agencyName: string;
  agencyAcronym: string;
  agencyType: string;
}

interface IsspEditorShellProps {
  doc: DocInfo;
  children: React.ReactNode;
}

export function IsspEditorShell({ doc, children }: IsspEditorShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <IsspSidebar
        doc={{ ...doc, creatorName: "", hasPart1: true }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
