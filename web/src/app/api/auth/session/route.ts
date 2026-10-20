import { NextResponse } from "next/server";
import { currentIdentity } from "@/lib/server/session";
export async function GET() {
  const identity = await currentIdentity();
  return NextResponse.json(identity ? { identity } : { error: "Sign in required" }, { status: identity ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
