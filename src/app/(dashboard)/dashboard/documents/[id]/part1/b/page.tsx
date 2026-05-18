import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Part1BForm } from "@/components/issp-editor/part1/part1-b-form";

export default async function Part1BPage({
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

  const DEFAULT_HC = {
    plantilla:   { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
    contractual: { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
    outsourced:  { it: { male: 0, female: 0 }, nonIt: { male: 0, female: 0 } },
  };

  const part1Data = doc.part1
    ? (() => {
        const saved = JSON.parse(doc.part1.humanCapital || "{}") as Partial<typeof DEFAULT_HC>;
        const humanCapital = {
          plantilla:   {
            it:    { ...DEFAULT_HC.plantilla.it,    ...(saved.plantilla?.it    ?? {}) },
            nonIt: { ...DEFAULT_HC.plantilla.nonIt, ...(saved.plantilla?.nonIt ?? {}) },
          },
          contractual: {
            it:    { ...DEFAULT_HC.contractual.it,    ...(saved.contractual?.it    ?? {}) },
            nonIt: { ...DEFAULT_HC.contractual.nonIt, ...(saved.contractual?.nonIt ?? {}) },
          },
          outsourced: {
            it:    { ...DEFAULT_HC.outsourced.it,    ...(saved.outsourced?.it    ?? {}) },
            nonIt: { ...DEFAULT_HC.outsourced.nonIt, ...(saved.outsourced?.nonIt ?? {}) },
          },
        };
        return {
          cioName: doc.part1.cioName,
          cioPosition: doc.part1.cioPosition,
          cioUnit: doc.part1.cioUnit,
          cioEmail: doc.part1.cioEmail,
          cioContact: doc.part1.cioContact,
          focalSameAsCio: false,
          focalName: doc.part1.focalName,
          focalPosition: doc.part1.focalPosition,
          focalUnit: doc.part1.focalUnit,
          focalEmail: doc.part1.focalEmail,
          focalContact: doc.part1.focalContact,
          humanCapital,
        };
      })()
    : null;

  return <Part1BForm initialData={part1Data} />;
}
