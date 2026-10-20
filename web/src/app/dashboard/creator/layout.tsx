import { redirect } from "next/navigation";
import { currentIdentity, hasRole } from "@/lib/server/session";
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const identity = await currentIdentity();
  if (!identity) redirect("/login");
  if (!hasRole(identity, "creator")) redirect("/access-denied");
  return children;
}
