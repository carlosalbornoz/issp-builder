"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type EditorMobileSidebarContextValue = {
  openMobileSidebar: () => void;
};

const EditorMobileSidebarContext = createContext<EditorMobileSidebarContextValue | null>(null);

export function EditorMobileSidebarProvider({
  value,
  children,
}: {
  value: EditorMobileSidebarContextValue;
  children: ReactNode;
}) {
  return (
    <EditorMobileSidebarContext.Provider value={value}>
      {children}
    </EditorMobileSidebarContext.Provider>
  );
}

export function useEditorMobileSidebar() {
  return useContext(EditorMobileSidebarContext);
}
