import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3E2Form } from "@/components/issp-editor/part3/part3-e2-form";

export default async function Part3E2Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      part3: { select: { proposedSystems: true, crossAgencyProjects: true, internalProjects: true } },
      part4: { select: { year1: true, year2: true, year3: true } },
    },
  });
  if (!doc) notFound();

  return (
    <Part3E2Form
      proposedSystems={JSON.parse(doc.part3?.proposedSystems ?? "[]")}
      initialProjects={JSON.parse(doc.part3?.crossAgencyProjects ?? "[]")}
      otherProjects={JSON.parse(doc.part3?.internalProjects ?? "[]")}
      startYear={doc.startYear}
      endYear={doc.endYear}
      part4={{
        year1: JSON.parse(doc.part4?.year1 || "{}"),
        year2: JSON.parse(doc.part4?.year2 || "{}"),
        year3: JSON.parse(doc.part4?.year3 || "{}"),
      }}
    />
  );
}
