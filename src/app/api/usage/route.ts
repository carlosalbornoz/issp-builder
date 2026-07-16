import { appendUsageLogEntry, parseUsageLogInput } from "@/lib/usage-log";

export const runtime = "nodejs";

const MAX_REQUEST_BODY_LENGTH = 4_096;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  const configuredAppUrl = process.env.APP_URL?.trim();
  const allowedOrigin = configuredAppUrl
    ? new URL(configuredAppUrl).origin
    : new URL(request.url).origin;
  return origin === allowedOrigin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BODY_LENGTH) {
      return Response.json({ error: "Request body is too large." }, { status: 413 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseUsageLogInput(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await appendUsageLogEntry(parsed.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Could not append ISSP usage log entry.", error);
    return Response.json({ error: "Usage log is temporarily unavailable." }, { status: 503 });
  }
}
