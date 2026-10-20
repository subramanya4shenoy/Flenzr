"use client";
import { useEffect, useState } from "react";
const MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled. Please try again.",
  google_session_expired: "Your Google sign-in session expired. Please start again.",
  google_access_denied: "Your account cannot access the selected workspace.",
  google_unavailable: "Could not complete Google sign-in. Please try again.",
};
export function AuthErrorNotice() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("auth_error");
    if (error) Promise.resolve().then(() => setMessage(MESSAGES[error] || "Could not sign in. Please try again."));
  }, []);
  return message ? <p role="alert" className="p-3 rounded-xl bg-red-500/10 text-red-300 text-sm">{message}</p> : null;
}
