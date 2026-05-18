import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3FForm } from "@/components/issp-editor/part3/part3-f-form";

export default async function Part3FPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      part3: {
        select: {
          internalProjects: true,
          crossAgencyProjects: true,
          performanceFramework: true,
        },
      },
    },
  });
  if (!doc) notFound();

  const allProjects = [
    ...JSON.parse(doc.part3?.internalProjects ?? "[]").map((p: { id: string; title: string }) => ({
      ...p,
      projectCategory: "internal" as const,
    })),
    ...JSON.parse(doc.part3?.crossAgencyProjects ?? "[]").map((p: { id: string; title: string }) => ({
      ...p,
      projectCategory: "crossAgency" as const,
    })),
  ];

  return (
    <Part3FForm
      allProjects={allProjects}
      initialFramework={JSON.parse(doc.part3?.performanceFramework ?? "{}")}
    />
  );
}
