import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part2DForm } from "@/components/issp-editor/part2/part2-d-form";

export default async function Part2DPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      agency: { select: { type: true } },
      part2: { select: { egpChecklist: true } },
    },
  });

  if (!doc) notFound();

  const egpChecklist = doc.part2
    ? JSON.parse(doc.part2.egpChecklist || "{}")
    : {};

  return (
    <Part2DForm
      docId={id}
      agencyType={doc.agency.type}
      initialData={egpChecklist}
    />
  );
}
