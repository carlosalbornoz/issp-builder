import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part2CForm } from "@/components/issp-editor/part2/part2-c-form";

export default async function Part2CPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part2: { select: { informationSystems: true } } },
  });

  if (!doc) notFound();

  const informationSystems = doc.part2
    ? JSON.parse(doc.part2.informationSystems || "[]")
    : [];

  return <Part2CForm initialData={informationSystems} />;
}
