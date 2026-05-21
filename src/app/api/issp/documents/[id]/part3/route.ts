import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const JSON_FIELDS = [
  "proposedCybersecControls",
  "proposedHumanCapital",
  "proposedSystems",
  "internalProjects",
  "crossAgencyProjects",
  "performanceFramework",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part3: true },
  });

  if (!doc || !doc.part3) return Response.json({ error: "Not found" }, { status: 404 });

  // Deserialize JSON fields for client
  const part3 = { ...doc.part3 } as Record<string, unknown>;
  for (const field of JSON_FIELDS) {
    if (typeof part3[field] === "string") {
      try {
        part3[field] = JSON.parse(part3[field] as string);
      } catch {
        part3[field] = field.endsWith("[]") ? [] : {};
      }
    }
  }

  return Response.json(part3);
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
    select: { id: true, part3: { select: { id: true } } },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  // Serialize JSON fields
  const data: Record<string, unknown> = { ...body };
  delete data.id;
  delete data.isspDocId;
  for (const field of JSON_FIELDS) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      data[field] = JSON.stringify(data[field]);
    }
  }

  const part3 = doc.part3
    ? await db.part3Strategy.update({ where: { isspDocId: id }, data })
    : await db.part3Strategy.create({ data: { isspDocId: id, ...data } });

  await db.isspDocument.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json(part3);
}
