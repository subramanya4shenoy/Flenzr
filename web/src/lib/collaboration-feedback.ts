import type { components } from "@/types/api";
export type Feedback = components["schemas"]["FeedbackRead"];
export type FeedbackWorkspace = components["schemas"]["FeedbackWorkspace"];
export type FeedbackCreate = components["schemas"]["FeedbackCreate"];
export const feedbackRatings = ["Very poor", "Poor", "Okay", "Good", "Excellent"];

export function feedbackPayload(rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5.");
  const text = comment.trim();
  if (Array.from(text).length < 10 || Array.from(text).length > 2000) throw new Error("Describe your experience in 10 to 2,000 characters.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error("Remove control characters from your feedback.");
  return { rating, comment: text };
}

export function feedbackStatus(workspace: FeedbackWorkspace) {
  if (!workspace.completion_id || workspace.collaboration_status !== "completed") return "Opens after completion";
  const mine = workspace.items.some(item => item.is_mine), other = workspace.items.some(item => !item.is_mine);
  return mine && other ? "Both reviews submitted" : mine ? "Your feedback submitted" : other ? "Your collaborator left feedback" : "Ready for feedback";
}
