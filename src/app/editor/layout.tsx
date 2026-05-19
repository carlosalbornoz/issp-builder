import { EditorShell } from "@/components/editor/editor-shell";

export const metadata = {
  title: "ISSP Editor",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <EditorShell>{children}</EditorShell>;
}
