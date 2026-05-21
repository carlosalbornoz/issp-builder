import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part1: true },
  });

  if (!doc || !doc.part1) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(doc.part1);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Verify document belongs to session user's agency
  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part1: true },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  // Serialize JSON fields
  const data: Record<string, unknown> = { ...body };
  delete data.id;
  delete data.isspDocId;
  if (data.orgOutcomes && typeof data.orgOutcomes !== "string") {
    data.orgOutcomes = JSON.stringify(data.orgOutcomes);
  }
  if (data.humanCapital && typeof data.humanCapital !== "string") {
    data.humanCapital = JSON.stringify(data.humanCapital);
  }
  if (data.stakeholders && typeof data.stakeholders !== "string") {
    data.stakeholders = JSON.stringify(data.stakeholders);
  }

  let part1;
  if (doc.part1) {
    part1 = await db.part1Profile.update({
      where: { isspDocId: id },
      data,
    });
  } else {
    part1 = await db.part1Profile.create({
      data: { isspDocId: id, ...data },
    });
  }

  // Touch the parent document's updatedAt
  await db.isspDocument.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return Response.json(part1);
}
