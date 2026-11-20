import { Suspense } from "react";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { currentIdentity, hasRole } from "@/lib/server/session";
import { cookies } from "next/headers";
import { DashboardWorkspaceBoundary } from "@/components/navigation/dashboard-workspace-boundary";

// Page-specific layouts retain their authentication and participant checks.
// Both workspace shells remain mounted when opening shared dashboard routes.
async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  const identity = await currentIdentity();
  if (!identity) return children;
  const canCreator = hasRole(identity, "creator"), canBrand = hasRole(identity, "brand_owner");
  if (!canCreator && !canBrand) return children;
  const preference = (await cookies()).get("flenzr_workspace")?.value;
  const initialWorkspace = canCreator && (!canBrand || preference === "creator") ? "creator" : "brand";
  return <DashboardWorkspaceBoundary ownerId={identity.user.id} creatorName={identity.user.full_name || "Creator"} canCreator={canCreator} canBrand={canBrand} initialWorkspace={initialWorkspace}>{children}</DashboardWorkspaceBoundary>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<WorkspaceLoader label="Opening your workspace…" />}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}
