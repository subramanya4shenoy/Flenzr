"use client";

import { useCreatorWorkspace } from "@/components/creator/creator-workspace";
import { useBrandWorkspace } from "@/components/brand/brand-workspace";

/** Standalone pages retain their back links when no workspace shell is present. */
export function SharedPageNavigation({ children }: { children: React.ReactNode }) {
  const inBrandWorkspace = useBrandWorkspace();
  const inCreatorWorkspace = useCreatorWorkspace();
  return inBrandWorkspace || inCreatorWorkspace ? null : <nav>{children}</nav>;
}
