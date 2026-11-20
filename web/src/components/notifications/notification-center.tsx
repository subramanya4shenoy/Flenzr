"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEnquiryActivity } from "@/components/enquiries/enquiry-activity";
import { NotificationItem, notificationRequest } from "@/lib/notifications";
import "./notifications.css";

export function NotificationBell() {
  const activity = useEnquiryActivity();
  const count = activity?.notificationCount;
  return <Link href="/dashboard/notifications" className="fl-notification-bell" aria-label={count ? `Notifications, ${count} unread` : "Notifications"} title="Notifications">
    <Bell size={17} aria-hidden="true" />{Boolean(count) && <span>{count! > 99 ? "99+" : count}</span>}
  </Link>;
}

export function NotificationCenter() {
  const activity = useEnquiryActivity();
  const client = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["notifications", activity?.ownerId, "list", page],
    queryFn: ({ signal }) => notificationRequest<NotificationItem[]>(`?limit=30&offset=${page * 30}`, { signal }),
    enabled: Boolean(activity?.ownerId), retry: false, gcTime: 0,
    refetchOnWindowFocus: true, refetchInterval: activity?.live ? false : 30_000,
    refetchIntervalInBackground: false,
  });
  async function open(item: NotificationItem) {
    if (busy) return;
    setBusy(item.id); setError("");
    try {
      if (item.is_unread) await notificationRequest(`/${item.id}/read`, { method: "POST" });
      await client.invalidateQueries({ queryKey: ["notifications", activity?.ownerId] });
      router.push(item.href);
    } catch (err) { setError(err instanceof Error ? err.message : "Please retry."); }
    finally { setBusy(null); }
  }
  const items = query.data || [];
  return <section className="fl-notifications" aria-label="Notifications">
    <header><div><h1>Notifications</h1><p>{activity?.notificationCount === undefined ? "Your enquiry updates" : `${activity.notificationCount} unread updates`}</p></div><button onClick={() => void client.invalidateQueries({ queryKey: ["notifications", activity?.ownerId] })} disabled={query.isFetching}>Refresh</button></header>
    {(error || query.isError) && <p role="alert">{error || query.error?.message}</p>}
    {query.isPending && <p role="status">Loading notifications…</p>}
    {!query.isPending && !query.isError && !items.length && <p>No notifications yet. New enquiries and replies will appear here.</p>}
    <ul>{items.map(item => <li key={item.id} data-unread={item.is_unread}>
      <div><h2>{item.title} {item.is_unread && <span>Unread</span>}</h2><p>{item.message}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div>
      <button onClick={() => void open(item)} disabled={busy !== null}>{busy === item.id ? "Opening…" : "Open enquiry"}</button>
    </li>)}</ul>
    <footer><button disabled={page === 0 || query.isFetching} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={items.length < 30 || query.isFetching} onClick={() => setPage(p => p + 1)}>Next</button></footer>
  </section>;
}
