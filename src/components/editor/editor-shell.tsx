"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { useFileSaveReminder } from "@/hooks/use-file-save-reminder";
import { EditorSidebar } from "./editor-sidebar";

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { loading, doc, unsavedToFile, saveToFile } = useIsspStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Warn before closing/navigating away when there are unsaved file changes
  useEffect(() => {
    if (!unsavedToFile) return;
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [unsavedToFile]);

  // Periodic reminder to save to file
  useFileSaveReminder(unsavedToFile, saveToFile);

  // IDB check in progress — show a centered spinner, don't flash content
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No document in store — bare layout for the splash page
  if (!doc) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  // Document loaded — full editor layout with collapsible sidebar
  return (
    <div className="flex h-screen overflow-hidden">
      <EditorSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
