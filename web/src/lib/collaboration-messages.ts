import type { components } from "@/types/api";
export type Message = components["schemas"]["MessageRead"];
export type MessagePage = components["schemas"]["MessagePage"];
export type MessageCreate = components["schemas"]["MessageCreate"];
export function messageText(value: string) {
  const text = value.trim();
  if (!text || Array.from(text).length > 4000) throw new Error("Write a message of up to 4,000 characters.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error("Remove control characters from your message.");
  return text;
}
