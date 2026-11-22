import { accessToken, API_URL, currentIdentity, requestOrigin } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== requestOrigin(request))) {
    return new Response(null, { status: 403 });
  }
  const identity = await currentIdentity();
  const token = identity ? await accessToken() : undefined;
  if (!identity || !token) return new Response(null, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });

  try {
    const upstream = await fetch(`${API_URL}/collaborations/${id}/chat/events`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status || 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

