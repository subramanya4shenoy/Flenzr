export interface NotificationItem {
  id: string; enquiry_id: string; kind: string; title: string; message: string;
  href: string; is_unread: boolean; created_at: string;
}
export async function notificationRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/notifications${path}`, {
    ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to view your notifications." : "Could not update notifications. Please retry.");
  return data as T;
}
