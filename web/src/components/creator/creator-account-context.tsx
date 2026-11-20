"use client";

import { createContext, useContext } from "react";
import { EnquiryActivityProvider } from "@/components/enquiries/enquiry-activity";

const CreatorAccountContext = createContext<string | null>(null);

export function CreatorAccountProvider({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  return <CreatorAccountContext.Provider value={ownerId}><EnquiryActivityProvider ownerId={ownerId}>{children}</EnquiryActivityProvider></CreatorAccountContext.Provider>;
}

export function useCreatorAccountId() {
  return useContext(CreatorAccountContext);
}
