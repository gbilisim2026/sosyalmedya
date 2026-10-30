"use client";

import { useState } from "react";
import { addPostCommentAction } from "@/app/actions/social";

type GifResult = { title: string; url: string; previewUrl: string; license: string; attributionUrl: string };

export function CommentComposer({ postId, variant }: { postId: string; variant: "feed" | "reel" }) {
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [gifSearchOpen, setGifSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dark = variant === "reel";
  const inputStyle = dark ? "border border-white/25 bg-black/30 text-white placeholder:text-white/55" : "border border-[#dce2dc] bg-white text-[#202522]";

  async function searchGifs() {
    if (query.trim().length < 2) {
      setError("GIF aramak için en az 2 karakter yaz.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/gifs/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json() as { results?: GifResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "GIF araması başarısız oldu.");
      setResults(payload.results ?? []);
      if (!payload.results?.length) setError("Bu aramada lisans bilgisi doğrulanmış GIF bulunamadı.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GIF araması başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={addPostCommentAction.bind(null, postId)} className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-1">
        {["😀", "😂", "😍", "🥰", "👍", "❤️", "🔥"].map((emoji) => <button key={emoji} type="button" onClick={() => setContent((value) => `${value}${emoji}`)} className={`rounded-md px-1.5 py-1 text-base ${dark ? "hover:bg-white/10" : "hover:bg-[#edf4e9]"}`} aria-label={`${emoji} ekle`}>{emoji}</button>)}
        <button type="button" onClick={() => setGifSearchOpen((value) => !value)} className={`rounded-md px-2 py-1 text-xs font-semibold ${dark ? "hover:bg-white/10" : "hover:bg-[#edf4e9]"}`} aria-expanded={gifSearchOpen}>GIF ara</button>
      </div>
      <input type="hidden" name="gifUrl" value={selectedGif?.url ?? ""} />
      <input type="hidden" name="gifAttributionUrl" value={selectedGif?.attributionUrl ?? ""} />
      <input type="hidden" name="gifLicense" value={selectedGif?.license ?? ""} />
      {selectedGif && <div className="flex items-center gap-2 text-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedGif.previewUrl} alt="Seçilen GIF" className="h-14 rounded-lg" />
        <span>{selectedGif.license} · <a href={selectedGif.attributionUrl} target="_blank" rel="noreferrer" className="underline">Atıf</a></span>
        <button type="button" onClick={() => setSelectedGif(null)} className="underline">Kaldır</button>
      </div>}
      {gifSearchOpen && results.length > 0 && <div className={`grid max-h-52 grid-cols-3 gap-2 overflow-auto rounded-lg p-2 ${dark ? "bg-black/40" : "bg-[#f4f6f2]"}`}>
        {results.map((gif) => <button key={gif.url} type="button" onClick={() => { setSelectedGif(gif); setResults([]); setGifSearchOpen(false); }} title={`${gif.title} · ${gif.license}`} className="overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gif.previewUrl} alt={gif.title} className="h-20 w-full object-cover" />
        </button>)}
      </div>}
      {gifSearchOpen && <div className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); void searchGifs(); }
        }} placeholder="Lisanslı GIF ara" aria-label="GIF arama terimi" className={`h-9 min-w-0 flex-1 rounded-lg px-2 text-xs ${inputStyle}`} />
        <button type="button" disabled={loading} onClick={() => void searchGifs()} className={`rounded-lg px-2 text-xs font-semibold ${dark ? "bg-white text-[#203d34]" : "bg-[#edf4e9] text-[#315b46]"}`}>{loading ? "Aranıyor..." : "GIF ara"}</button>
      </div>}
      {error && <p role="status" className="text-[11px] text-[#e99a8b]">{error}</p>}
      <div className="flex gap-2">
        <input name="content" value={content} onChange={(event) => setContent(event.currentTarget.value)} maxLength={1000} placeholder="Yorum yaz..." aria-label="Yorum yaz" className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs outline-none ${inputStyle}`} />
        <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${dark ? "bg-white text-[#203d34]" : "bg-[#203d34] text-white"}`}>Yayınla</button>
      </div>
    </form>
  );
}
