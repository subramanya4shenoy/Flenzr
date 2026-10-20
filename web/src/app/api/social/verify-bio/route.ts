import { NextResponse } from "next/server";
import { accessToken, API_URL, sameOrigin } from "@/lib/server/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const token = await accessToken();
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await request.json();
    const res = await fetch(`${API_URL}/creators/verify-bio`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform: body.platform, handle: body.handle, verification_code: body.verificationCode, creator_handle: body.creatorHandle }),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Verification temporarily unavailable" }, { status: 503 });
  }
}
