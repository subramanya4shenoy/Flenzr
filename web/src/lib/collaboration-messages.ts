export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface ChatParticipantMeta {
  peer_name: string;
  peer_role: "brand" | "creator";
  peer_avatar_url: string | null;
  my_avatar_url: string | null;
  peer_online: boolean;
  peer_last_seen_at: string | null;
  peer_last_read_sequence: number;
  my_last_read_sequence: number;
}

export interface Message {
  id: string;
  sequence: number;
  author_role: "brand" | "creator";
  is_mine: boolean;
  text: string;
  message_type?: "text" | "call_event";
  reactions?: MessageReactionSummary[];
  sent_at: string;
}

export interface MessagePage {
  items: Message[];
  latest_sequence: number;
  next_before: number | null;
  limit: number;
  meta?: ChatParticipantMeta | null;
}

export interface MessageCreate {
  request_id: string;
  text: string;
  message_type?: "text" | "call_event";
}

export type ChatSignalKind =
  | "typing"
  | "heartbeat"
  | "call_ring"
  | "call_accept"
  | "call_decline"
  | "call_offer"
  | "call_answer"
  | "call_ice"
  | "call_end";

export function messageText(value: string) {
  const text = value.trim();
  if (!text || Array.from(text).length > 4000) throw new Error("Write a message of up to 4,000 characters.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error("Remove control characters from your message.");
  return text;
}

export function avatarProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  // Request uncropped higher-res Google avatars instead of Google's =s96-c square crop.
  const normalized = url.includes("googleusercontent.com/") ? url.replace(/=s\d+-c$/i, "=s256") : url;
  return `/api/proxy-image?url=${encodeURIComponent(normalized)}`;
}

export function formatLastSeen(iso: string | null | undefined, online: boolean): string {
  if (online) return "Online";
  if (!iso) return "Offline";
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Recently active";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Active ${days}d ago`;
  return `Last active ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(Date.parse(iso))}`;
}

export function formatShortTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(parsed);
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "🎉", "👏"] as const;

export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀", "😊", "😁", "😂", "🥰", "😍", "🤩", "😎", "🤔", "🙌", "🥳", "😅", "🙂", "😉", "😌", "🤯"] },
  { label: "Gestures", emojis: ["👍", "👎", "👏", "🙏", "🤝", "✌️", "👌", "💪", "🫶", "👋", "☝️", "✍️"] },
  { label: "Work & Content", emojis: ["🎬", "📸", "🎥", "🎙️", "📱", "💻", "📝", "📅", "⏰", "🔗", "📎", "📦", "✅", "🚀", "💡", "📈"] },
  { label: "Hearts & Vibes", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "⭐", "🎉", "💯", "🏆"] },
];
