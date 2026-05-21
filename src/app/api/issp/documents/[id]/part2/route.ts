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
    include: { part2: true },
  });

  if (!doc || !doc.part2) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(doc.part2);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part2: true },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  // Serialize JSON fields
  const data: Record<string, unknown> = { ...body };
  delete data.id;
  delete data.isspDocId;
  const jsonFields = ["strategicConcerns", "cybersecurityControls", "informationSystems", "egpChecklist"];
  for (const field of jsonFields) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      data[field] = JSON.stringify(data[field]);
    }
  }

  let part2;
  if (doc.part2) {
    part2 = await db.part2Assessment.update({
      where: { isspDocId: id },
      data,
    });
  } else {
    part2 = await db.part2Assessment.create({
      data: { isspDocId: id, ...data },
    });
  }

  await db.isspDocument.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json(part2);
}
