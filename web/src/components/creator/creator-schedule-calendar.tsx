"use client";
import { CollaborationCalendar } from "@/components/collaborations/calendar";

export function CreatorScheduleCalendar({ compact = false }: { compact?: boolean }) {
  return <CollaborationCalendar compact={compact} />;
}
