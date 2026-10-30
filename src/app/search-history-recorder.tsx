"use client";

import { useEffect } from "react";

export function SearchHistoryRecorder({ query }: { query: string }) {
  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    void fetch("/api/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error(`Search history request failed (${response.status}).`);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) console.error("Could not save search history.", error);
    });
    return () => controller.abort();
  }, [query]);
  return null;
}
