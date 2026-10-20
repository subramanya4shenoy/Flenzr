import { NextResponse } from "next/server";
import { accessToken, API_URL, sameOrigin } from "@/lib/server/session";

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (request.method !== "GET" && !sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const token = await accessToken();
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { path } = await context.params;
  if (!path.length || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)) || !["creators", "identity", "ratecards", "links", "qrcodes", "organizations", "campaigns"].includes(path[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const upstream = await fetch(`${API_URL}/${path.join("/")}${new URL(request.url).search}`, {
      method: request.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(request.method === "GET" ? {} : { body: await request.text() }), cache: "no-store", redirect: "error",
    });
    if (upstream.status === 204) return new Response(null, { status: 204 });
    const data = await upstream.json();
    // The access token stays exclusively in the HttpOnly cookie.
    if (path.join("/") === "creators/onboard" && data.access_token) delete data.access_token;
    return NextResponse.json(data, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
