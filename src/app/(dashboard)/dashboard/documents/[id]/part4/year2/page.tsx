import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part4YearForm, YearBudget } from "@/components/issp-editor/part4/part4-year-form";

export default async function Part4Year2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part3: true, part4: true },
  });

  if (!doc) notFound();

  const internalProjects: { id: string; title: string }[] = [];
  const crossAgencyProjects: { id: string; title: string }[] = [];

  if (doc.part3) {
    try {
      const internal = JSON.parse(doc.part3.internalProjects || "[]");
      internal.forEach((p: { id: string; title: string }) => {
        if (p.id && p.title) internalProjects.push({ id: p.id, title: p.title });
      });
    } catch { /* empty */ }
    try {
      const cross = JSON.parse(doc.part3.crossAgencyProjects || "[]");
      cross.forEach((p: { id: string; title: string }) => {
        if (p.id && p.title) crossAgencyProjects.push({ id: p.id, title: p.title });
      });
    } catch { /* empty */ }
  }

  const year2Data = doc.part4
    ? (JSON.parse(doc.part4.year2 || "{}") as YearBudget)
    : null;

  return (
    <Part4YearForm
      docId={id}
      year={doc.startYear + 1}
      yearKey="year2"
      initialData={year2Data ?? {
        officeProductivity: { capitalOutlay: [], mooe: [] },
        internalProjects: {},
        crossAgencyProjects: {},
        continuingCosts: { mooe: [] },
      }}
      internalProjects={internalProjects}
      crossAgencyProjects={crossAgencyProjects}
    />
  );
}
