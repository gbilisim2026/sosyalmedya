"use client";

import { useEffect, useState } from "react";

type PresencePayload = { visible: boolean; online?: boolean; lastActiveAt?: string | null };

export function PresenceStatus({ conversationId }: { conversationId: string }) {
  const [presence, setPresence] = useState<PresencePayload | null>(null);

  useEffect(() => {
    let active = false;
    const refresh = async () => {
      if (active || document.visibilityState !== "visible") return;
      active = true;
      try {
        const response = await fetch(`/api/presence?conversationId=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Presence request failed (${response.status}).`);
        setPresence(await response.json() as PresencePayload);
      } catch (error) {
        console.error("Could not retrieve presence status.", error);
      } finally {
        active = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  if (!presence?.visible) return null;
  if (presence.online) return <span className="flex items-center gap-1.5 text-xs text-[#315b46]"><span className="size-2 rounded-full bg-emerald-500" />Çevrimiçi</span>;
  if (!presence.lastActiveAt) return <span className="text-xs text-[#788179]">Çevrimdışı</span>;
  return <time className="text-xs text-[#788179]">Son görülme {new Date(presence.lastActiveAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</time>;
}
