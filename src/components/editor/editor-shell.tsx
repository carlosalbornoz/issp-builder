"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsspStore } from "@/lib/store";
import { EditorSidebar } from "./editor-sidebar";
import { EditorMobileSidebarProvider } from "./editor-mobile-sidebar-context";
import { IsspMigrationReviewDialog } from "./issp-migration-review-dialog";

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { loading, doc, unsavedToFile } = useIsspStore();
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
      <div className="h-dvh overflow-hidden bg-background">
        <IsspMigrationReviewDialog />
        <EditorSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main
          className={cn(
            "h-full overflow-y-auto overscroll-contain bg-background transition-[padding] duration-200 ease-out [overflow-anchor:none]",
            sidebarCollapsed ? "md:pl-12" : "md:pl-72"
          )}
        >
          <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </EditorMobileSidebarProvider>
  );
}
