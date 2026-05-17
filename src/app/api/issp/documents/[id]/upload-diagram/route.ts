import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join, extname } from "path";

export interface NetworkDiagram {
  id: string;
  path: string;
  title: string;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getDiagrams(docId: string): Promise<NetworkDiagram[]> {
  const part2 = await db.part2Assessment.findUnique({ where: { isspDocId: docId } });
  if (!part2) return [];
  try { return JSON.parse(part2.networkDiagrams); } catch { return []; }
}

async function saveDiagrams(docId: string, diagrams: NetworkDiagram[]) {
  await db.part2Assessment.upsert({
    where: { isspDocId: docId },
    update: { networkDiagrams: JSON.stringify(diagrams) },
    create: { isspDocId: docId, networkDiagrams: JSON.stringify(diagrams) },
  });
  await db.isspDocument.update({ where: { id: docId }, data: { updatedAt: new Date() } });
}

// POST — upload a new diagram
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.isspDocument.findFirst({ where: { id, agencyId: session.user.agencyId } });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim() ?? "";

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return Response.json({ error: "Only PNG, JPG, WebP, and SVG files are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return Response.json({ error: "File must be under 10 MB" }, { status: 400 });

  const diagramId = genId();
  const ext = extname(file.name) || `.${file.type.split("/")[1].replace("svg+xml", "svg")}`;
  const filename = `${diagramId}${ext}`;
  const dir = join(process.cwd(), "public", "uploads", id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const newDiagram: NetworkDiagram = {
    id: diagramId,
    path: `/uploads/${id}/${filename}`,
    title,
  };

  const diagrams = await getDiagrams(id);
  diagrams.push(newDiagram);
  await saveDiagrams(id, diagrams);

  return Response.json(newDiagram);
}

// PATCH — update titles / reorder (receives full array)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.isspDocument.findFirst({ where: { id, agencyId: session.user.agencyId } });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json() as { diagrams: NetworkDiagram[] };
  await saveDiagrams(id, body.diagrams);
  return Response.json({ ok: true });
}

// DELETE — remove a single diagram by id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.isspDocument.findFirst({ where: { id, agencyId: session.user.agencyId } });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const { diagramId } = await request.json() as { diagramId: string };
  const diagrams = await getDiagrams(id);
  const target = diagrams.find((d) => d.id === diagramId);

  if (target) {
    const filePath = join(process.cwd(), "public", target.path);
    await unlink(filePath).catch(() => {}); // ignore if already gone
  }

  await saveDiagrams(id, diagrams.filter((d) => d.id !== diagramId));
  return Response.json({ ok: true });
}
