import { NextResponse } from "next/server";
import { API_URL, hasRole, identityForToken, sameOrigin, saveSession } from "./session";

export async function passwordAuth(request: Request, signup = false) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  try {
    const body = await request.json();
    const { email, password, fullName } = body;
    if (typeof email !== "string" || !email.includes("@") || typeof password !== "string" || password.length < (signup ? 8 : 1)) {
      return NextResponse.json({ error: signup ? "Enter a valid email and password of at least 8 characters" : "Enter your email and password" }, { status: 400 });
    }
    const role = !signup && body.role === "brand" ? "brand_owner" : "creator";
    const result = await fetch(`${url.replace(/\/$/, "")}/auth/v1/${signup ? "signup" : "token?grant_type=password"}`, {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, ...(signup ? { data: { full_name: fullName } } : {}) }),
    });
    const data = await result.json();
    if (!result.ok) return NextResponse.json({ error: signup ? "Could not create the account. Check your details or sign in." : "Invalid email or password" }, { status: 401 });
    if (!data.access_token) return NextResponse.json({ confirmationRequired: true, message: "Check your email to confirm your account, then sign in to finish your profile." }, { status: 202 });
    const sync = await fetch(`${API_URL}/identity/sync`, {
      method: "POST", headers: { Authorization: `Bearer ${data.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }), cache: "no-store",
    });
    if (!sync.ok) return NextResponse.json({ error: "Could not verify your application account" }, { status: sync.status === 403 ? 403 : 401 });
    const identity = await identityForToken(data.access_token);
    if (!identity || !hasRole(identity, role)) return NextResponse.json({ error: "Your account does not have access to this workspace" }, { status: 403 });
    await saveSession(data.access_token, Number(data.expires_in) || 3600);
    return NextResponse.json({ identity, redirect: role === "creator" ? "/dashboard/creator" : "/dashboard/brand" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable" }, { status: 503 });
  }
}
