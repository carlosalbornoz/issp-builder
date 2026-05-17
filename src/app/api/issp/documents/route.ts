import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db.isspDocument.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      creator: { select: { name: true, email: true } },
      agency: { select: { name: true, acronym: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json(docs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, startYear, endYear, scope, amendmentNumber } = body;

  if (!title || !startYear || !endYear || !scope) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const doc = await db.isspDocument.create({
    data: {
      title,
      startYear: Number(startYear),
      endYear: Number(endYear),
      scope,
      amendmentNumber: Number(amendmentNumber ?? 0),
      agencyId: session.user.agencyId,
      createdBy: session.user.id,
      // Auto-create all Part records
      part1: { create: {} },
      part2: { create: {} },
      part3: { create: {} },
      part4: { create: {} },
    },
    include: {
      creator: { select: { name: true } },
      agency: { select: { name: true, acronym: true } },
    },
  });

  return Response.json(doc, { status: 201 });
}
