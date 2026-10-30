"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MessageRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
