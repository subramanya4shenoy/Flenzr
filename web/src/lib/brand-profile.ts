import type { Organization } from "./api";

export type BrandProfileFields = {
  name: string; company_name: string; billing_email: string;
  industry: string; website: string; description: string;
};
export const emptyBrandProfile: BrandProfileFields = {
  name: "", company_name: "", billing_email: "", industry: "", website: "", description: "",
};
export function brandProfileFields(org: Organization): BrandProfileFields {
  return { name: org.name, company_name: org.brand_profile?.company_name || org.name,
    billing_email: org.billing_email, industry: org.brand_profile?.industry || "",
    website: org.brand_profile?.website || "", description: org.brand_profile?.description || "" };
}
export async function brandProfileRequest(method: "GET" | "POST" | "PATCH", fields?: BrandProfileFields): Promise<Organization | null> {
  const res = await fetch(`/api/account/organizations${method === "POST" ? "" : "/me"}`, {
    method, cache: "no-store", headers: { "Content-Type": "application/json" },
    ...(fields ? { body: JSON.stringify(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]))) } : {}),
  });
  if (method === "GET" && res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error("Your session has expired. Sign in again to edit your brand profile.");
    if (res.status === 403) throw new Error("Only the brand owner can edit this profile.");
    if (res.status === 422) throw new Error("Check your profile details. Use a valid email and a full http:// or https:// website address.");
    throw new Error(data?.error?.message || "Could not load or save your brand profile. Please retry.");
  }
  return data as Organization;
}
