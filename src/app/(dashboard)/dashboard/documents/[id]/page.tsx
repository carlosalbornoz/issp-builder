import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IsspOverviewContent } from "@/components/issp-editor/issp-overview-content";

export default async function IsspDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { agency: { select: { name: true, acronym: true } } },
  });

  if (!doc) notFound();

  return (
    <IsspOverviewContent
      docId={id}
      agencyName={doc.agency.name}
      agencyAcronym={doc.agency.acronym}
      title={doc.title}
      startYear={doc.startYear}
      endYear={doc.endYear}
      amendmentNumber={doc.amendmentNumber}
    />
  );
}
