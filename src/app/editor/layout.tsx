import { IsspStoreProvider } from "@/lib/store";
import { EditorShell } from "@/components/editor/editor-shell";

export const metadata = {
  title: "ISSP Editor",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <IsspStoreProvider>
      <EditorShell>{children}</EditorShell>
    </IsspStoreProvider>
  );
}
