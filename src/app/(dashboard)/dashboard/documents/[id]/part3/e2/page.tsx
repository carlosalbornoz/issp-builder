import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3E2Form } from "@/components/issp-editor/part3/part3-e2-form";

export default async function Part3E2Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      part3: { select: { proposedSystems: true, crossAgencyProjects: true } },
    },
  });
  if (!doc) notFound();

  return (
    <Part3E2Form
      docId={id}
      proposedSystems={JSON.parse(doc.part3?.proposedSystems ?? "[]")}
      initialProjects={JSON.parse(doc.part3?.crossAgencyProjects ?? "[]")}
    />
  );
}
