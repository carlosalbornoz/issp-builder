import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part3AForm } from "@/components/issp-editor/part3/part3-a-form";

export default async function Part3APage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      part2: { select: { networkDescription: true, cybersecurityControls: true } },
      part3: { select: { proposedNetworkDesc: true, proposedCybersecControls: true } },
    },
  });
  if (!doc) notFound();

  return (
    <Part3AForm
      initialData={{
        proposedNetworkDataUrl: null,
        proposedNetworkDesc: doc.part3?.proposedNetworkDesc ?? "",
        proposedCybersecControls: JSON.parse(doc.part3?.proposedCybersecControls ?? "{}"),
        currentNetworkDesc: doc.part2?.networkDescription ?? "",
        currentCybersecControls: JSON.parse(doc.part2?.cybersecurityControls ?? "{}"),
      }}
    />
  );
}
