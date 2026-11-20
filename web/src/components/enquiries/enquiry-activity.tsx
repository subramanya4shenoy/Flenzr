"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { enquiryRequest } from "@/lib/enquiries";
import { subscribeEnquiryActivity } from "@/lib/enquiry-live";
import { notificationRequest } from "@/lib/notifications";
import "./enquiries.css";

interface EnquiryActivity {
  ownerId: string;
  counts: { received: number; sent: number } | undefined;
  refresh: () => void;
  live: boolean;
  changeVersion: number;
  notificationCount: number | undefined;
}
const ActivityContext = createContext<EnquiryActivity | null>(null);

export function EnquiryActivityProvider({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><ActivityScope key={ownerId} ownerId={ownerId}>{children}</ActivityScope></QueryClientProvider>;
}

function ActivityScope({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  const client = useQueryClient();
  const [live, setLive] = useState(false);
  const [changeVersion, setChangeVersion] = useState(0);
  useEffect(() => subscribeEnquiryActivity(() => {
    void client.invalidateQueries({ queryKey: ["enquiry-unread", ownerId] });
    void client.invalidateQueries({ queryKey: ["notifications", ownerId] });
    setChangeVersion(version => version + 1);
  }, setLive), [client, ownerId]);
  const query = useQuery({
    queryKey: ["enquiry-unread", ownerId],
    queryFn: ({ signal }) => enquiryRequest<{ received: number; sent: number }>("/unread-counts", { signal }),
    retry: false, staleTime: 0, gcTime: 0,
    refetchOnWindowFocus: true,
    // Refresh only this lightweight count, never provider/social analytics.
    refetchInterval: live ? false : 30_000, refetchIntervalInBackground: false,
  });
  const notifications = useQuery({
    queryKey: ["notifications", ownerId, "count"],
    queryFn: ({ signal }) => notificationRequest<number>("/unread-count", { signal }),
    retry: false, gcTime: 0, refetchOnWindowFocus: true,
    refetchInterval: live ? false : 30_000, refetchIntervalInBackground: false,
  });
  const activity = { ownerId, live, changeVersion, notificationCount: notifications.isError ? undefined : notifications.data, counts: query.isError ? undefined : query.data, refresh: () => { void query.refetch(); } };
  return <ActivityContext.Provider value={activity}>{children}</ActivityContext.Provider>;
}

export function useEnquiryActivity() {
  return useContext(ActivityContext);
}

export function EnquiryUnreadBadge({ view, className = "fl-enquiry-count" }: { view: "received" | "sent"; className?: string }) {
  const activity = useEnquiryActivity();
  const count = activity?.counts?.[view];
  if (!count) return null;
  return <span className={className} role="status" aria-label={`${count} unread ${count === 1 ? "enquiry" : "enquiries"}`} title={`${count} unread ${count === 1 ? "enquiry" : "enquiries"}`}>{count > 99 ? "99+" : count}</span>;
}
