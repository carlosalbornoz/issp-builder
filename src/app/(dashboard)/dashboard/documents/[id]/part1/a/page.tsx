import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part1AForm } from "@/components/issp-editor/part1/part1-a-form";

export default async function Part1APage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part1: true, agency: { select: { type: true } } },
  });

  if (!doc) notFound();

  const part1Data = doc.part1
    ? {
        legalBasis: doc.part1.legalBasis,
        mandateFunction: doc.part1.mandateFunction,
        visionStatement: doc.part1.visionStatement,
        missionStatement: doc.part1.missionStatement,
        orgOutcomes: JSON.parse(doc.part1.orgOutcomes || "[]"),
      }
    : null;

  return (
    <Part1AForm
      docId={id}
      agencyType={doc.agency.type}
      initialData={part1Data}
    />
  );
}
