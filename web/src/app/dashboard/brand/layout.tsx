import { redirect } from "next/navigation";
import { currentIdentity, hasRole } from "@/lib/server/session";
export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const identity = await currentIdentity();
  if (!identity) redirect("/login");
  if (!hasRole(identity, "brand_owner")) redirect("/access-denied");
  return children;
}
