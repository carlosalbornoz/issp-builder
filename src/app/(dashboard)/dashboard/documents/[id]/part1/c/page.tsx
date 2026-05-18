import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part1CForm } from "@/components/issp-editor/part1/part1-c-form";

export default async function Part1CPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part1: true },
  });

  if (!doc) notFound();

  const stakeholders = doc.part1
    ? JSON.parse(doc.part1.stakeholders || "[]")
    : [];

  return <Part1CForm initialData={stakeholders} />;
}
