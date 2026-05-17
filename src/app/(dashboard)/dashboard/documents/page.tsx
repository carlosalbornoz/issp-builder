import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DocumentsListClient } from "./documents-list-client";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const docs = await db.isspDocument.findMany({
    where: { agencyId: session.user.agencyId },
    include: { creator: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = docs.map((d) => ({
    id: d.id,
    title: d.title,
    startYear: d.startYear,
    endYear: d.endYear,
    status: d.status as "DRAFT" | "REVIEW" | "SUBMITTED" | "APPROVED",
    amendmentNumber: d.amendmentNumber,
    scope: d.scope,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    creatorName: d.creator.name,
  }));

  const user = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: (session.user as { role?: string }).role ?? "USER",
    agencyName: (session.user as { agencyName?: string }).agencyName ?? "",
  };

  return <DocumentsListClient initialDocs={serialized} user={user} />;
}
