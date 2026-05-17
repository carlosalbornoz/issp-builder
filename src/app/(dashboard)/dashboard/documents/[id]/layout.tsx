import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IsspEditorShell } from "@/components/issp-editor/issp-editor-shell";

export default async function IsspDocumentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { agency: { select: { name: true, acronym: true, type: true } } },
  });

  if (!doc) notFound();

  const docInfo = {
    id: doc.id,
    title: doc.title,
    startYear: doc.startYear,
    endYear: doc.endYear,
    status: doc.status,
    amendmentNumber: doc.amendmentNumber,
    scope: doc.scope,
    agencyName: doc.agency.name,
    agencyAcronym: doc.agency.acronym,
    agencyType: doc.agency.type,
  };

  return <IsspEditorShell doc={docInfo}>{children}</IsspEditorShell>;
}
