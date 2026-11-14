"use client";

import { useState, useEffect, useCallback } from "react";

export interface AuthSession {
  provider?: string;
  email: string;
  fullName: string;
  handle: string;
  role: "creator" | "brand";
  avatarUrl?: string | null;
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial hydration from localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem("flenzr_auth_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email || parsed.handle)) {
          setSession(parsed);
          if (parsed.avatarUrl) {
            setUserAvatar(parsed.avatarUrl);
          } else {
            const handle = parsed.handle || "";
            const chosen = handle ? localStorage.getItem(`flenzr_chosen_avatar_${handle}`) : null;
            const cached = handle ? localStorage.getItem(`flenzr_avatar_${handle}`) : null;
            if (chosen) {
              setUserAvatar(chosen);
            } else if (cached) {
              setUserAvatar(cached);
            } else {
              const rawProfile = localStorage.getItem("flenzr_creator_profile");
              if (rawProfile) {
                try {
                  const prof = JSON.parse(rawProfile);
                  if (prof.avatar_url || prof.avatarUrl) {
                    setUserAvatar(prof.avatar_url || prof.avatarUrl);
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch {}

    // 2. Validate session with the backend API
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (!active) return;
        if (data?.identity?.user?.is_active) {
          const id = data.identity;
          const isCreator = id.active_roles?.includes("creator");
          const role: "creator" | "brand" = isCreator ? "creator" : "brand";

          let handle = "";
          let fullName = id.user.full_name || (isCreator ? "Creator" : "Brand");
          let avatar: string | null = null;

          if (isCreator) {
            try {
              const creatorRes = await fetch("/api/account/creators/me", { cache: "no-store" });
              if (creatorRes.ok) {
                const creator = await creatorRes.json();
                if (creator.handle) handle = creator.handle;
                if (creator.display_name) fullName = creator.display_name;
                if (creator.avatar_url) avatar = creator.avatar_url;
              }
            } catch {}
          }

          if (!avatar && handle) {
            avatar =
              localStorage.getItem(`flenzr_chosen_avatar_${handle}`) ||
              localStorage.getItem(`flenzr_avatar_${handle}`);
          }

          const resolvedSession: AuthSession = {
            email: id.user.email,
            fullName,
            handle,
            role,
            avatarUrl: avatar,
          };

          setSession(resolvedSession);
          if (avatar) setUserAvatar(avatar);
          localStorage.setItem("flenzr_auth_session", JSON.stringify(resolvedSession));
        } else {
          // No active session cookie
          setSession(null);
          setUserAvatar(null);
          localStorage.removeItem("flenzr_auth_session");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      localStorage.removeItem("flenzr_auth_session");
      localStorage.removeItem("flenzr_creator_profile");
      localStorage.removeItem("flenzr_token");
      setSession(null);
      setUserAvatar(null);
      window.location.href = "/";
    }
  }, []);

  const profileHref = session
    ? session.role === "brand"
      ? "/dashboard/brand"
      : "/dashboard/creator"
    : "/";

  return {
    session,
    userAvatar,
    mounted,
    loading,
    profileHref,
    signOut,
  };
}
