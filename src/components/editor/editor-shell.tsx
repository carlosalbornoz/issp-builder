"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useIsspStore } from "@/lib/store";
import { useFileSaveReminder } from "@/hooks/use-file-save-reminder";
import { EditorSidebar } from "./editor-sidebar";
import { EditorMobileSidebarProvider } from "./editor-mobile-sidebar-context";

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { loading, doc, unsavedToFile, saveToFile } = useIsspStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !doc) router.replace("/");
  }, [loading, doc, router]);

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
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No document — redirect to homepage is in flight, show nothing
  if (!doc) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Document loaded — full editor layout with collapsible sidebar
  return (
    <EditorMobileSidebarProvider value={{ openMobileSidebar: () => setMobileSidebarOpen(true) }}>
      <div className="flex h-dvh overflow-hidden">
        <EditorSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background">
          <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </EditorMobileSidebarProvider>
  );
}
