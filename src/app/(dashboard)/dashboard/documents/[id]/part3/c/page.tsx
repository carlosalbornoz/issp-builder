import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3CForm } from "@/components/issp-editor/part3/part3-c-form";

export default async function Part3CPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part3: { select: { proposedHumanCapital: true } } },
  });
  if (!doc) notFound();

  return (
    <Part3CForm
      docId={id}
      initialData={JSON.parse(doc.part3?.proposedHumanCapital ?? "[]")}
    />
  );
}
