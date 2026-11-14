import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sameOrigin, SESSION_COOKIE, REFRESH_COOKIE } from "@/lib/server/session";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  return NextResponse.json({ success: true });
}
