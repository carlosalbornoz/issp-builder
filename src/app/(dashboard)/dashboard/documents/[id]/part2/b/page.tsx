import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part2BForm } from "@/components/issp-editor/part2/part2-b-form";

export default async function Part2BPage({
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
      part2: {
        select: {
          networkDiagrams: true,
          networkDescription: true,
          cybersecurityControls: true,
        },
      },
    },
  });

  if (!doc) notFound();

  const initialData = doc.part2
    ? {
        networkDiagrams: JSON.parse(doc.part2.networkDiagrams || "[]"),
        networkDescription: doc.part2.networkDescription,
        cybersecurityControls: JSON.parse(doc.part2.cybersecurityControls || "{}"),
      }
    : null;

  return <Part2BForm docId={id} initialData={initialData} />;
}
