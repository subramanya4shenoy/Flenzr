"use client";

import { createContext, useContext } from "react";

const CreatorAccountContext = createContext<string | null>(null);

export function CreatorAccountProvider({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  return <CreatorAccountContext.Provider value={ownerId}>{children}</CreatorAccountContext.Provider>;
}

export function useCreatorAccountId() {
  return useContext(CreatorAccountContext);
}
