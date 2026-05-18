import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3BForm } from "@/components/issp-editor/part3/part3-b-form";

export default async function Part3BPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part3: { select: { enterpriseArchDiagram: true } } },
  });
  if (!doc) notFound();

  return <Part3BForm initialDiagramDataUrl={null} />;
}
