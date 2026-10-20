import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, hasRole, identityForToken, requestOrigin, sameOrigin, saveSession } from "./session";

const FLOW_COOKIE = "flenzr_google_flow";
const FLOW_PATH = "/api/auth/google";
interface GoogleFlow {
  verifier: string;
  state: string;
  role: "creator" | "brand_owner";
  signup: boolean;
  origin: string;
  expiresAt: number;
}
function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function beginGoogle(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  try {
    const body = await request.json();
    if (!["creator", "brand"].includes(body.role) || typeof body.signup !== "boolean") {
      return NextResponse.json({ error: "Invalid sign-in request" }, { status: 400 });
    }
    const settings = await fetch(`${base}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!settings.ok) throw Error("Provider settings unavailable");
    if (!(await settings.json()).external?.google) {
      return NextResponse.json({ error: "Google sign-in is disabled for this project. Enable Google in Supabase Authentication → Sign In / Providers." }, { status: 503 });
    }
    const verifier = randomBytes(64).toString("base64url");
    const state = randomBytes(32).toString("base64url");
    const origin = requestOrigin(request);
    const flow: GoogleFlow = { verifier, state, role: body.role === "brand" ? "brand_owner" : "creator", signup: body.signup, origin, expiresAt: Date.now() + 600000 };
    const callback = new URL("/api/auth/google/callback", origin);
    callback.searchParams.set("app_state", state);
    const authorize = new URL(`${base}/auth/v1/authorize`);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", callback.toString());
    authorize.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
    authorize.searchParams.set("code_challenge_method", "s256");
    (await cookies()).set(FLOW_COOKIE, JSON.stringify(flow), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: FLOW_PATH, maxAge: 600,
    });
    return NextResponse.json({ url: authorize.toString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not start Google sign-in. Please retry." }, { status: 503 });
  }
}

export async function completeGoogle(request: Request) {
  const origin = requestOrigin(request);
  const cookieStore = await cookies();
  const stored = cookieStore.get(FLOW_COOKIE)?.value;
  // Consume the browser-bound flow, including on errors. A retry starts a new flow.
  cookieStore.set(FLOW_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: FLOW_PATH, maxAge: 0 });
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?auth_error=${reason}`, origin), 303);
  try {
    const params = new URL(request.url).searchParams;
    if (!stored || params.has("error")) return fail("google_cancelled");
    const flow: GoogleFlow = JSON.parse(stored);
    const state = params.get("app_state");
    const code = params.get("code");
    if (!state || !code || flow.origin !== origin || flow.expiresAt < Date.now() || !equal(state, flow.state) || !/^[A-Za-z0-9_-]{43,128}$/.test(flow.verifier) || !["creator", "brand_owner"].includes(flow.role)) {
      return fail("google_session_expired");
    }
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return fail("google_unavailable");
    const exchange = await fetch(`${base}/auth/v1/token?grant_type=pkce`, {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ auth_code: code, code_verifier: flow.verifier }),
    });
    if (!exchange.ok) return fail("google_session_expired");
    const session = await exchange.json();
    if (!session.access_token) return fail("google_unavailable");
    const sync = await fetch(`${API_URL}/identity/sync`, {
      method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: flow.role }), cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!sync.ok) return fail("google_access_denied");
    const identity = await identityForToken(session.access_token);
    if (!identity || !hasRole(identity, flow.role)) return fail("google_access_denied");
    let destination = flow.role === "brand_owner" ? "/dashboard/brand" : "/dashboard/creator";
    if (flow.role === "creator") {
      const profile = await fetch(`${API_URL}/creators/me`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!profile.ok) return fail("google_access_denied");
      // Both new sign-ins and signup clicks resume onboarding for an empty profile.
      if (!(await profile.json()).bio) destination = "/signup/creator";
    }
    await saveSession(session.access_token, Number(session.expires_in) || 3600);
    const next = new URL("/auth/complete", origin);
    next.searchParams.set("next", destination);
    return NextResponse.redirect(next, 303);
  } catch { return fail("google_unavailable"); }
}
