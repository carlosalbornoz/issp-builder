import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const JSON_FIELDS = ["year1", "year2", "year3", "summary"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: { part4: true },
  });

  if (!doc || !doc.part4) return Response.json({ error: "Not found" }, { status: 404 });

  const part4 = { ...doc.part4 } as Record<string, unknown>;
  for (const field of JSON_FIELDS) {
    if (typeof part4[field] === "string") {
      try {
        part4[field] = JSON.parse(part4[field] as string);
      } catch {
        part4[field] = {};
      }
    }
  }

  return Response.json(part4);
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
    select: { id: true, part4: { select: { id: true } } },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...body };
  for (const field of JSON_FIELDS) {
    if (data[field] !== undefined && typeof data[field] !== "string") {
      data[field] = JSON.stringify(data[field]);
    }
  }

  const part4 = doc.part4
    ? await db.part4Resources.update({ where: { isspDocId: id }, data })
    : await db.part4Resources.create({ data: { isspDocId: id, ...data } });

  await db.isspDocument.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json(part4);
}
