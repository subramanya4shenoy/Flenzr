"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BrandWorkspace } from "@/components/brand/brand-workspace";
import { CreatorWorkspace } from "@/components/creator/creator-workspace";
import { CreatorAccountProvider } from "@/components/creator/creator-account-context";
import { EnquiryActivityProvider } from "@/components/enquiries/enquiry-activity";

export function DashboardWorkspaceBoundary({ ownerId, creatorName, canCreator, canBrand, initialWorkspace, children }: {
  ownerId: string; creatorName: string; canCreator: boolean; canBrand: boolean;
  initialWorkspace: "creator" | "brand"; children: ReactNode;
}) {
  const pathname = usePathname();
  const [lastWorkspace, setLastWorkspace] = useState(initialWorkspace);
  const workspace = pathname.startsWith("/dashboard/creator") ? "creator" : pathname.startsWith("/dashboard/brand") ? "brand" : lastWorkspace;
  useEffect(() => {
    if ((workspace === "creator" && !canCreator) || (workspace === "brand" && !canBrand)) return;
    document.cookie = `flenzr_workspace=${workspace}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const timer = window.setTimeout(() => setLastWorkspace(workspace), 0);
    return () => window.clearTimeout(timer);
  }, [workspace, canCreator, canBrand]);
  // Workspace preference chooses appearance only. Existing route/API permissions still govern access.
  if (workspace === "creator" && canCreator) return <CreatorAccountProvider ownerId={ownerId}><CreatorWorkspace initialName={creatorName}>{children}</CreatorWorkspace></CreatorAccountProvider>;
  if (workspace === "brand" && canBrand) return <EnquiryActivityProvider ownerId={ownerId}><BrandWorkspace>{children}</BrandWorkspace></EnquiryActivityProvider>;
  return children;
}
