import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3DForm } from "@/components/issp-editor/part3/part3-d-form";

export default async function Part3DPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part3: { select: { proposedSystems: true, internalProjects: true, crossAgencyProjects: true } } },
  });
  if (!doc) notFound();

  return (
    <Part3DForm
      initialSystems={JSON.parse(doc.part3?.proposedSystems ?? "[]")}
      linkingProjects={[
        ...JSON.parse(doc.part3?.internalProjects ?? "[]"),
        ...JSON.parse(doc.part3?.crossAgencyProjects ?? "[]"),
      ].map((p: { id: string; title?: string; linkedSystemIds?: string[] }) => ({
        id: p.id,
        title: p.title ?? "",
        linkedSystemIds: p.linkedSystemIds ?? [],
      }))}
    />
  );
}
