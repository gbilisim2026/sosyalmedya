"use client";

import { useEffect, useState } from "react";
import { startConversationAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";

type SearchUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarScale: number;
  avatarOffsetX: number;
  avatarOffsetY: number;
  hasConversation: boolean;
};

export function MessageSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(term)}&page=${page}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json() as { users?: SearchUser[]; hasMore?: boolean; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Kullanıcı araması başarısız oldu.");
        setResults((current) => page === 0 ? (payload.users ?? []).sort((a, b) => Number(b.hasConversation) - Number(a.hasConversation)) : [...current, ...(payload.users ?? [])]);
        setHasMore(Boolean(payload.hasMore));
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Kullanıcı araması başarısız oldu.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, page]);

  return (
    <section className="mt-5">
      <label className="block text-xs font-semibold text-[#526058]">Kişi ara
        <input value={query} onChange={(event) => {
          setQuery(event.currentTarget.value);
          setPage(0);
          setResults([]);
          setError("");
          setHasMore(false);
        }} maxLength={60} placeholder="Ad soyad veya kullanıcı adı" className="mt-1 h-11 w-full rounded-xl border border-[#dce2dc] bg-white px-3 text-sm font-normal" />
      </label>
      {loading && <p role="status" className="mt-2 text-xs text-[#788179]">Aranıyor…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-[#a53f30]">{error}</p>}
      {query.trim().length >= 2 && !loading && !error && <div className="mt-2 divide-y divide-[#edf0eb] rounded-xl border border-[#e1e6df] bg-white px-3">
        {results.map((person) => <div key={person.id} className="flex items-center gap-3 py-3">
          <UserAvatar {...person} className="size-10" />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.displayName ?? person.username}</span><span className="text-xs text-[#788179]">@{person.username}</span></span>
          <form action={startConversationAction.bind(null, person.username)}>
            <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">{person.hasConversation ? "Sohbete git" : "Mesaj isteği gönder"}</button>
          </form>
        </div>)}
        {!results.length && <p className="py-4 text-center text-xs text-[#788179]">Eşleşme bulunamadı.</p>}
        {hasMore && <button type="button" disabled={loading} onClick={() => setPage((current) => current + 1)} className="my-3 w-full rounded-lg border border-[#dce2dc] py-2 text-xs font-semibold disabled:opacity-60">Daha fazla sonuç yükle</button>}
      </div>}
    </section>
  );
}
