"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { migrateLocalData } from "@/lib/local-data";

export function LocalDataBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        migrateLocalData();
        setReady(true);
      } catch {
        setFailed(true);
      }
    });
    return () => { active = false; };
  }, []);

  // Public profiles retain server rendering. Local account screens mount only
  // after the migration, so stale users and balances cannot flash or reload.
  const accountScreen = pathname.startsWith("/dashboard") || pathname.startsWith("/signup") || pathname === "/login";
  if (accountScreen && !ready) {
    return failed ? <p className="p-8 text-sm text-[color:var(--ui-ink-neutral-400)]" role="alert">Browser storage is unavailable. Enable site storage and reload to continue.</p> : <WorkspaceLoader label="Preparing your workspace…" />;
  }
  return children;
}
