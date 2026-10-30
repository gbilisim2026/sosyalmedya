"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Film, Search } from "lucide-react";

type VideoItem = {
  provider: "YOUTUBE" | "WIKIMEDIA_COMMONS" | "INTERNET_ARCHIVE";
  providerId: string;
  title: string;
  description: string | null;
  creatorName: string;
  creatorUrl: string;
  embedUrl: string;
  mediaUrl: string | null;
  sourceUrl: string;
  thumbnailUrl: string | null;
  licenseUrl: string | null;
  licenseName: string | null;
};

type Source = "commons" | "archive" | "youtube";

const sources: { id: Source; label: string; caption: string }[] = [
  { id: "commons", label: "Wikimedia Commons", caption: "Resmî açık katalog · anahtar yok" },
  { id: "archive", label: "Internet Archive", caption: "Açık RSS akışı · API anahtarı yok" },
  { id: "youtube", label: "YouTube", caption: "Resmî oynatıcı · isteğe bağlı API anahtarı" },
];

export function ExternalVideoExplorer({ category, searchTerm }: { category: string; searchTerm: string }) {
  const [query, setQuery] = useState(searchTerm);
  const [source, setSource] = useState<Source>("commons");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: term, category, source });
        const response = await fetch(`/api/videos/search?${params}`, { signal: controller.signal });
        const result = await response.json() as { videos?: VideoItem[]; available?: boolean; nextPageToken?: string | null; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Harici video araması başarısız oldu.");
        setVideos(result.videos ?? []);
        setNextPageToken(result.nextPageToken ?? null);
        setAvailable(Boolean(result.available));
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Video araması başarısız oldu.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, source]);

  async function loadMore() {
    if (!nextPageToken || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query.trim(), category, source, pageToken: nextPageToken });
      const response = await fetch(`/api/videos/search?${params}`);
      const result = await response.json() as { videos?: VideoItem[]; nextPageToken?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Daha fazla video alınamadı.");
      setVideos((current) => [...current, ...(result.videos ?? []).filter((item) => !current.some((existing) => existing.provider === item.provider && existing.providerId === item.providerId))]);
      setNextPageToken(result.nextPageToken ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Daha fazla video alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="discovery-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow"><Film size={14} /> Açık kaynak keşfi</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Videoları keşfet</h2>
          <p className="mt-1 max-w-xl text-sm text-[#68716b]">Kaynakların resmi sayfa ve oynatıcıları kullanılır; video dosyaları platforma kopyalanmaz.</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Video ara</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#788179]" />
          <input value={query} onChange={(event) => {
            setQuery(event.currentTarget.value);
            setVideos([]);
            setNextPageToken(null);
            setAvailable(null);
          }} maxLength={100} placeholder="Bir konu ara..." className="discovery-search" />
        </label>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Video kaynakları">
        {sources.map((item) => (
          <button key={item.id} type="button" aria-pressed={source === item.id} onClick={() => {
            setSource(item.id);
            setVideos([]);
            setNextPageToken(null);
            setAvailable(null);
          }} className={`source-pill ${source === item.id ? "source-pill-active" : ""}`}>
            <span className="block whitespace-nowrap">{item.label}</span>
            <span className="mt-0.5 hidden text-[10px] font-normal opacity-75 sm:block">{item.caption}</span>
          </button>
        ))}
      </div>
      {loading && <p role="status" className="mt-4 text-sm text-[#68716b]">Açık katalogda aranıyor…</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff1ee] p-3 text-sm text-[#a53f30]">{error}</p>}
      {available === false && source === "youtube" && <p className="mt-4 rounded-xl bg-[#f7f9f6] p-4 text-sm text-[#68716b]">YouTube araması için sunucuda YOUTUBE_DATA_API_KEY gerekir. Anahtar gerektirmeyen Commons ve Archive kaynaklarını kullanabilirsin.</p>}
      {available && !videos.length && !loading && !error && <p className="mt-5 rounded-xl border border-dashed border-[#dce2dc] p-8 text-center text-sm text-[#788179]">Bu aramada lisans bilgisi doğrulanmış video bulunamadı. Başka bir konu deneyebilirsin.</p>}
      {videos.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => <article key={`${video.provider}:${video.providerId}`} className="video-discovery-card">
          <div className="video-discovery-media">
            {video.mediaUrl ? (
              <video src={video.mediaUrl} poster={video.thumbnailUrl ?? undefined} controls playsInline preload="none" className="size-full object-contain" />
            ) : (
              <iframe
                src={video.embedUrl}
                title={video.title}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="size-full border-0"
              />
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="source-tag">{video.provider === "WIKIMEDIA_COMMONS" ? "Commons" : video.provider === "INTERNET_ARCHIVE" ? "Internet Archive" : "YouTube"}</span>
              {video.licenseName && <span className="truncate text-[10px] font-medium text-[#68716b]">{video.licenseName}</span>}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{video.title}</h3>
            <p className="mt-1 truncate text-xs text-[#68716b]">Kaynak: {video.creatorName}</p>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf0eb] pt-3">
              {video.licenseUrl ? <a href={video.licenseUrl} target="_blank" rel="noreferrer" className="truncate text-[11px] font-medium text-[#557260] hover:underline">Lisans bilgisi</a> : <span />}
              <a href={video.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#315b46] hover:underline">Kaynağa git <ExternalLink size={13} /></a>
            </div>
          </div>
        </article>)}
      </div>}
      {nextPageToken && <button type="button" disabled={loading} onClick={() => void loadMore()} className="mt-5 w-full rounded-xl border border-[#dce2dc] bg-white py-3 text-sm font-semibold transition hover:bg-[#f4f6f2] disabled:opacity-60">Daha fazla video yükle</button>}
      <p className="mt-4 text-[11px] leading-5 text-[#788179]">Commons ve Internet Archive sonuçları lisans metadatasına göre filtrelenir. İçerik ve lisans koşulları kaynak sayfasında geçerlidir.</p>
    </section>
  );
}
