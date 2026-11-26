import type { components } from "@/types/api";

export type ActivityEvent = components["schemas"]["CollaborationActivityRead"];
export type ActivityPage = components["schemas"]["CollaborationActivityPage"];
export type ActivitySection = ActivityEvent["section"];

export function mergeActivity(existing: ActivityEvent[], incoming: ActivityEvent[]): ActivityEvent[] {
  return [...new Map([...existing, ...incoming].map(item => [item.id, item])).values()];
}

export function activityActor(event: Pick<ActivityEvent, "actor_role" | "actor_name" | "is_mine">): string {
  if (event.actor_role === "both" || event.actor_role === null) return event.actor_name;
  return `${event.actor_name} · ${event.is_mine ? "You" : event.actor_role === "brand" ? "Brand/client" : "Creator"}`;
}
