import { NextResponse } from "next/server";
import { API_URL } from "@/lib/server/session";

export async function GET(request: Request) {
  const params = new URLSearchParams();
  const incoming = new URL(request.url).searchParams;
  for (const key of ["q", "niche", "location", "min_rating", "limit", "offset", "network", "min_audience", "max_audience", "updated_within_days"]) {
    const value = incoming.get(key);
    if (value !== null) params.set(key, value);
  }
  try {
    const upstream = await fetch(`${API_URL}/discovery/creators/page?${params}`, {
      cache: "no-store", signal: AbortSignal.timeout(15000), redirect: "error",
    });
    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Creator search is temporarily unavailable. Please retry." }, { status: 503 });
  }
}
