"use client";

import { useEffect } from "react";

export function PresenceHeartbeat() {
  useEffect(() => {
    let active = false;
    const heartbeat = async () => {
      if (document.visibilityState !== "visible" || active) return;
      active = true;
      try {
        await fetch("/api/presence", { method: "POST", cache: "no-store" });
      } catch (error) {
        console.error("Could not update online status.", error);
      } finally {
        active = false;
      }
    };
    void heartbeat();
    const timer = window.setInterval(() => { void heartbeat(); }, 60_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);
  return null;
}
