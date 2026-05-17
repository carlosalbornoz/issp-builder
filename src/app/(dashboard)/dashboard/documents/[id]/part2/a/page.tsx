import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part2AForm } from "@/components/issp-editor/part2/part2-a-form";

export default async function Part2APage({
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
      part1: { select: { orgOutcomes: true } },
      part2: { select: { strategicConcerns: true } },
    },
  });

  if (!doc) notFound();

  const orgOutcomes = doc.part1 ? JSON.parse(doc.part1.orgOutcomes || "[]") : [];
  const strategicConcerns = doc.part2
    ? JSON.parse(doc.part2.strategicConcerns || "[]")
    : [];

  return (
    <Part2AForm
      docId={id}
      orgOutcomes={orgOutcomes}
      initialData={strategicConcerns}
    />
  );
}
