import { NextResponse } from "next/server";
import { accessToken, API_URL, requestOrigin } from "@/lib/server/session";

export async function GET(request: Request) {
  const destination = new URL("/dashboard/creator", requestOrigin(request));
  const finish = (result: string) => {
    destination.searchParams.set("facebook", result);
    destination.hash = "analytics";
    return NextResponse.redirect(destination, 303);
  };
  const params = new URL(request.url).searchParams;
  const error = params.get("error");
  if (error) return finish(error === "access_denied" ? "cancelled" : "authorization_failed");
  const code = params.get("code"), state = params.get("state");
  if (!code || !state) return finish("expired");
  const token = await accessToken();
  if (!token) return finish("session_expired");
  try {
    const response = await fetch(`${API_URL}/creators/me/facebook/callback`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }), cache: "no-store", signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok) {
      const results: Record<string, string> = {
        FACEBOOK_NOT_CONFIGURED: "not_configured", FACEBOOK_FLOW_EXPIRED: "expired",
        FACEBOOK_AUTHORIZATION_FAILED: "authorization_failed", FACEBOOK_USER_LOGIN_REQUIRED: "configuration_required",
        FACEBOOK_PERMISSION_REQUIRED: "permissions_required", FACEBOOK_NO_PAGES: "no_pages",
        FACEBOOK_TOO_MANY_PAGES: "too_many_pages", FACEBOOK_RATE_LIMITED: "rate_limited",
        PERMISSION_DENIED: "page_mismatch",
      };
      return finish(results[data.error?.code] || "failed");
    }
    return finish(data.selectionRequired ? "select_pages" : "connected");
  } catch { return finish("failed"); }
}
