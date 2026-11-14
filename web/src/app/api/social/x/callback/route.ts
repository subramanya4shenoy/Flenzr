import { NextResponse } from "next/server";
import { accessToken, API_URL, requestOrigin } from "@/lib/server/session";

export async function GET(request: Request) {
  const destination = new URL("/dashboard/creator", requestOrigin(request));
  const finish = (result: string) => {
    destination.searchParams.set("x", result);
    destination.hash = "analytics";
    return NextResponse.redirect(destination, 303);
  };
  const params = new URL(request.url).searchParams;
  const error = params.get("error");
  if (error) {
    if (["invalid_scope", "unauthorized_client"].includes(error)) return finish("permissions_unavailable");
    return finish(error === "access_denied" ? "cancelled" : "authorization_failed");
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return finish("expired");
  const token = await accessToken();
  if (!token) return finish("session_expired");
  try {
    const response = await fetch(`${API_URL}/creators/me/x/callback`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }), cache: "no-store", signal: AbortSignal.timeout(40000),
    });
    if (!response.ok) {
      const data = await response.json();
      const results: Record<string, string> = {
        X_NOT_CONFIGURED: "not_configured", X_FLOW_EXPIRED: "expired",
        X_AUTHORIZATION_FAILED: "authorization_failed", X_PERMISSION_REQUIRED: "permissions_unavailable",
        X_CLIENT_CONFIGURATION: "client_configuration", X_API_ACCESS_REQUIRED: "api_access_required",
        X_BILLING_REQUIRED: "service_unavailable", X_RATE_LIMITED: "rate_limited",
        PERMISSION_DENIED: "account_mismatch",
      };
      return finish(results[data.error?.code] || "failed");
    }
    return finish("connected");
  } catch { return finish("failed"); }
}
