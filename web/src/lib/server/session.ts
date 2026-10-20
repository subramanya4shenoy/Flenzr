import { cookies } from "next/headers";

export const SESSION_COOKIE = "flenzr_access";
export const API_URL = `${(process.env.BACKEND_API_URL || "http://127.0.0.1:8210").replace(/\/$/, "")}/api/v1`;
export interface Identity {
  user: { id: string; email: string; full_name: string | null; is_active: boolean; is_superadmin: boolean };
  active_roles: string[];
  creator_id: string | null;
}
export async function accessToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
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
export async function currentIdentity() {
  const token = await accessToken();
  return token ? identityForToken(token) : null;
}
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
export async function saveSession(token: string, expiresIn: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: Math.min(Math.max(expiresIn, 0), 3600),
  });
}
