import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sameOrigin, SESSION_COOKIE } from "@/lib/server/session";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
