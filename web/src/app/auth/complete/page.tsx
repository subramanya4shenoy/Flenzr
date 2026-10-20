"use client";

import { useEffect, useState } from "react";
import { selectLocalAccount, migrateLocalData } from "@/lib/local-data";

export default function AuthComplete() {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) { window.location.replace("/login"); return; }
        const data = await res.json();
        if (!active) return;
        migrateLocalData();
        selectLocalAccount(data.identity.user.email);
        const next = new URLSearchParams(window.location.search).get("next");
        const allowed = ["/dashboard/creator", "/dashboard/brand", "/signup/creator"];
        window.location.replace(next && allowed.includes(next) ? next : "/dashboard/creator");
      } catch { if (active) setError("Could not finish sign-in. Please return to login and retry."); }
    };
    finish();
    return () => { active = false; };
  }, []);
  return <main className="p-12 text-sm text-neutral-300">{error || "Completing your sign-in…"}</main>;
}
