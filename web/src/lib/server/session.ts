import { cache } from "react";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "flenzr_access";
export const REFRESH_COOKIE = "flenzr_refresh";
export const API_URL = `${(process.env.BACKEND_API_URL || "http://127.0.0.1:8210").replace(/\/$/, "")}/api/v1`;
export interface Identity {
  user: { id: string; email: string; full_name: string | null; is_active: boolean; is_superadmin: boolean };
  active_roles: string[];
  creator_id: string | null;
}
export async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) return token;

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data.access_token) {
      await saveSession(data.access_token, Number(data.expires_in) || 3600, data.refresh_token);
      return data.access_token;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
export async function identityForToken(token: string): Promise<Identity | null> {
  try {
    const res = await fetch(`${API_URL}/identity/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return null;
    const identity: Identity = await res.json();
    return identity.user.is_active ? identity : null;
  } catch {
    return null;
  }
}
// Deduplicate layout/page session checks only within this server render.
// Never persist an identity across requests or accounts.
export const currentIdentity = cache(async function currentIdentity() {
  const token = await accessToken();
  if (token) {
    const identity = await identityForToken(token);
    if (identity) return identity;
  }
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            await saveSession(data.access_token, Number(data.expires_in) || 3600, data.refresh_token);
            return identityForToken(data.access_token);
          }
        }
      } catch {}
    }
  }
  return null;
});

export function hasRole(identity: Identity, role: "creator" | "brand_owner") {
  return identity.user.is_superadmin || identity.active_roles.includes(role);
}
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  // Next.js may normalize request.url to its internal hostname.
  return new URL(process.env.APP_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`).origin;
}
export function sameOrigin(request: Request) {
  try { return request.headers.get("origin") === requestOrigin(request); }
  catch { return false; }
}
export async function saveSession(token: string, expiresIn: number, refreshToken?: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: Math.max(expiresIn, 3600),
  });
  if (refreshToken) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
      maxAge: 30 * 24 * 3600,
    });
  }
}
