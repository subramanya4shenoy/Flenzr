import { NextResponse } from "next/server";
import { accessToken, API_URL, requestOrigin } from "@/lib/server/session";

export async function GET(request: Request) {
  const destination = new URL("/dashboard/creator", requestOrigin(request));
  const finish = (result: string) => {
    destination.searchParams.set("instagram", result);
    destination.hash = "analytics";
    return NextResponse.redirect(destination, 303);
  };
  const params = new URL(request.url).searchParams;
  if (params.has("error")) return finish("cancelled");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return finish("expired");
  const token = await accessToken();
  if (!token) return finish("session_expired");
  try {
    const response = await fetch(`${API_URL}/creators/me/instagram/callback`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }), cache: "no-store", signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      const data = await response.json();
      const results: Record<string, string> = {
        INSTAGRAM_ACCOUNT_NOT_SHARED: "account_not_shared",
        INSTAGRAM_ACCOUNT_NOT_AUTHORIZED: "account_not_authorized",
        INSTAGRAM_ACCOUNT_MISMATCH: "account_mismatch",
        INSTAGRAM_FLOW_EXPIRED: "expired",
        INSTAGRAM_CONFIGURATION_CHANGED: "configuration_changed",
        INSTAGRAM_BUSINESS_REQUIRED: "business_required",
        PERMISSION_DENIED: "account_mismatch",
      };
      return finish(results[data.error?.code] || "failed");
    }
    return finish("connected");
  } catch { return finish("failed"); }
}
