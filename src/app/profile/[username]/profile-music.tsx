"use client";

import Image from "next/image";
import { useState } from "react";
import { removeProfileMusicAction, saveProfileMusicAction } from "@/app/actions/social";

type MusicTrack = {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  previewUrl: string;
  trackUrl: string;
};

type ProfileMusicProps = {
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  trackUrl: string | null;
  isOwner: boolean;
};

export function ProfileMusic(props: ProfileMusicProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    const term = query.trim();
    if (term.length < 2) {
      setError("En az 2 karakter yaz.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`);
      const payload = await response.json() as { results?: MusicTrack[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Müzik araması başarısız oldu.");
      setResults(payload.results ?? []);
      if (!payload.results?.length) setError("Uygun önizlemesi bulunan parça bulunamadı.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Müzik araması başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4 max-w-xl rounded-2xl border border-[#e1e6df] bg-white p-4">
      {props.title && props.artist && props.artworkUrl && props.previewUrl && props.trackUrl && (
        <div className="flex items-center gap-3">
          <Image src={props.artworkUrl} alt={`${props.title} kapak görseli`} width={64} height={64} unoptimized className="size-16 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{props.title}</p>
            <p className="truncate text-xs text-[#68716b]">{props.artist}</p>
            <audio controls preload="none" src={props.previewUrl} className="mt-2 h-9 w-full" aria-label={`${props.title} önizlemesini oynat`} />
          </div>
          <a href={props.trackUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#557260] hover:underline">Apple Music</a>
        </div>
      )}
      {props.isOwner && (
        <div className="mt-4 border-t border-[#edf0eb] pt-4">
          <h2 className="text-sm font-semibold">{props.title ? "Profil müziğini değiştir" : "Profiline müzik ekle"}</h2>
          <div className="mt-2 flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); void search(); }
            }} placeholder="Şarkı veya sanatçı ara" className="h-10 min-w-0 flex-1 rounded-lg border border-[#dce2dc] px-3 text-sm" />
            <button type="button" disabled={loading} onClick={() => void search()} className="rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white disabled:opacity-60">{loading ? "Aranıyor..." : "Ara"}</button>
          </div>
          {error && <p role="status" className="mt-2 text-xs text-[#a53f30]">{error}</p>}
          {results.length > 0 && <ul className="mt-3 max-h-64 divide-y divide-[#edf0eb] overflow-y-auto rounded-xl border border-[#e1e6df]">
            {results.map((track) => <li key={track.trackId} className="flex items-center gap-3 p-2">
              <Image src={track.artworkUrl} alt="" width={44} height={44} unoptimized className="size-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{track.title}</p><p className="truncate text-[11px] text-[#68716b]">{track.artist}</p></div>
              <button type="button" onClick={() => setSelected(track)} className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Seç</button>
            </li>)}
          </ul>}
          {selected && <form action={saveProfileMusicAction} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#edf4e9] p-3">
            <input type="hidden" name="trackId" value={selected.trackId} />
            <input type="hidden" name="title" value={selected.title} />
            <input type="hidden" name="artist" value={selected.artist} />
            <input type="hidden" name="artworkUrl" value={selected.artworkUrl} />
            <input type="hidden" name="previewUrl" value={selected.previewUrl} />
            <input type="hidden" name="trackUrl" value={selected.trackUrl} />
            <span className="min-w-0 truncate text-xs">@profil için: {selected.title} · {selected.artist}</span>
            <button className="shrink-0 rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white">Kaydet</button>
          </form>}
          {props.title && <form action={removeProfileMusicAction} className="mt-3">
            <button className="text-xs font-semibold text-[#8b4236] hover:underline">Profil müziğini kaldır</button>
          </form>}
        </div>
      )}
      <p className="mt-3 text-[10px] text-[#788179]">Müzik Apple kataloğundan alınan kısa önizleme olarak oynatılır; uygulama telifli tam parçaları saklamaz.</p>
    </section>
  );
}
