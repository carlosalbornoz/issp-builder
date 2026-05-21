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
    include: {
      creator: { select: { name: true, email: true } },
      agency: { select: { name: true, acronym: true, type: true } },
      part1: true,
      part2: true,
      part3: true,
      part4: true,
    },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(doc);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, startYear, endYear, scope, amendmentNumber } = body;

  // Verify ownership
  const existing = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const doc = await db.isspDocument.update({
    where: { id },
    data: { title, startYear, endYear, scope, amendmentNumber },
  });

  return Response.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await db.isspDocument.delete({ where: { id } });
  return Response.json({ success: true });
}
