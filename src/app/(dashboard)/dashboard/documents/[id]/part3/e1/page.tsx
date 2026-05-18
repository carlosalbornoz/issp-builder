import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3E1Form } from "@/components/issp-editor/part3/part3-e1-form";

export default async function Part3E1Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      part3: {
        select: { proposedSystems: true, internalProjects: true },
      },
    },
  });
  if (!doc) notFound();

  return (
    <Part3E1Form
      proposedSystems={JSON.parse(doc.part3?.proposedSystems ?? "[]")}
      initialProjects={JSON.parse(doc.part3?.internalProjects ?? "[]")}
    />
  );
}
