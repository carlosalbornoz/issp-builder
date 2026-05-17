// Bare layout — no sidebar, no header.
// The documents-list page has its own navbar.
// The document editor has its own full-screen shell (IsspEditorShell).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
