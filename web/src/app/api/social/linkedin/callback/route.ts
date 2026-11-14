import { NextResponse } from "next/server";
import { accessToken, API_URL, requestOrigin } from "@/lib/server/session";

export async function GET(request: Request) {
  const destination = new URL("/dashboard/creator", requestOrigin(request));
  const finish = (result: string) => {
    destination.searchParams.set("linkedin", result);
    destination.hash = "analytics";
    return NextResponse.redirect(destination, 303);
  };
  const params = new URL(request.url).searchParams;
  const providerError = params.get("error");
  if (providerError) {
    if (["invalid_scope_error", "invalid_scope", "unauthorized_scope_error"].includes(providerError)) return finish("permissions_unavailable");
    if (["user_cancelled_login", "user_cancelled_authorize", "access_denied"].includes(providerError)) return finish("cancelled");
    return finish("authorization_failed");
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return finish("expired");
  const token = await accessToken();
  if (!token) return finish("session_expired");
  try {
    const response = await fetch(`${API_URL}/creators/me/linkedin/callback`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }), cache: "no-store", signal: AbortSignal.timeout(40000),
    });
    if (!response.ok) {
      const data = await response.json();
      const results: Record<string, string> = {
        LINKEDIN_NOT_CONFIGURED: "not_configured",
        LINKEDIN_FLOW_EXPIRED: "expired",
        LINKEDIN_AUTHORIZATION_FAILED: "authorization_failed",
        PERMISSION_DENIED: "account_mismatch",
      };
      return finish(results[data.error?.code] || "failed");
    }
    return finish("connected");
  } catch { return finish("failed"); }
}
