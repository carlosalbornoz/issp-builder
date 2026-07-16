import { EditorShell } from "@/components/editor/editor-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ISSP Editor",
  description:
    "Use the local-first ISSP Builder editor to prepare a DICT 2026 Information Systems Strategic Plan in your browser.",
  path: "/editor",
});

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <EditorShell>{children}</EditorShell>;
}
