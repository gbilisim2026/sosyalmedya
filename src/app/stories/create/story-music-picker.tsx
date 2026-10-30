"use client";

import Image from "next/image";
import { useState } from "react";

type MusicTrack = {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  previewUrl: string;
  trackUrl: string;
};

export type StoryMusicSelection = MusicTrack & {
  startSeconds: number;
  durationSeconds: number;
  labelStyle: "compact" | "cover";
  labelPosition: "top" | "bottom";
  labelScale: number;
};

export function StoryMusicPicker({
  selected,
  onChange,
}: {
  selected: StoryMusicSelection | null;
  onChange: (selection: StoryMusicSelection | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    if (query.trim().length < 2) {
      setError("En az 2 karakter yaz.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json() as { results?: MusicTrack[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Müzik kataloğuna ulaşılamadı.");
      setResults(payload.results ?? []);
      if (!payload.results?.length) setError("Önizlemesi bulunan parça bulunamadı.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Müzik araması başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  function update(patch: Partial<StoryMusicSelection>) {
    if (selected) onChange({ ...selected, ...patch });
  }

  return (
    <section className="rounded-xl border border-[#dce2dc] p-3">
      <h2 className="text-sm font-semibold">Hikâyene müzik ekle</h2>
      <div className="mt-2 flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); void search(); }
        }} placeholder="Şarkı veya sanatçı ara" className="h-10 min-w-0 flex-1 rounded-lg border border-[#dce2dc] px-3 text-sm" />
        <button type="button" disabled={loading} onClick={() => void search()} className="rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white disabled:opacity-60">{loading ? "Aranıyor..." : "Ara"}</button>
      </div>
      {error && <p role="status" className="mt-2 text-xs text-[#a53f30]">{error}</p>}
      {results.length > 0 && <ul className="mt-2 max-h-52 divide-y divide-[#edf0eb] overflow-y-auto rounded-lg border border-[#edf0eb]">
        {results.map((track) => <li key={track.trackId} className="flex items-center gap-2 p-2">
          <Image src={track.artworkUrl} alt="" width={40} height={40} unoptimized className="size-10 rounded-md object-cover" />
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{track.title}</span><span className="block truncate text-[11px] text-[#788179]">{track.artist}</span></span>
          <button type="button" onClick={() => onChange({
            ...track,
            startSeconds: 0,
            durationSeconds: 15,
            labelStyle: "compact",
            labelPosition: "bottom",
            labelScale: 1,
          })} className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Seç</button>
        </li>)}
      </ul>}
      {selected && <div className="mt-3 space-y-3 rounded-lg bg-[#f7f9f6] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-semibold">{selected.title} · {selected.artist}</p>
          <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-[#a53f30]">Müziği kaldır</button>
        </div>
        <audio controls preload="none" src={selected.previewUrl} className="h-9 w-full" aria-label="Seçilen şarkı önizlemesi" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">Önizlemeden başlangıç: {selected.startSeconds} sn
            <input type="range" min={0} max={20} value={selected.startSeconds} onChange={(event) => update({ startSeconds: Number(event.currentTarget.value) })} className="mt-1 block w-full accent-[#315b46]" />
          </label>
          <label className="text-xs font-medium">Hikâyede çalma süresi: {selected.durationSeconds} sn
            <input type="range" min={5} max={30} value={selected.durationSeconds} onChange={(event) => update({ durationSeconds: Number(event.currentTarget.value) })} className="mt-1 block w-full accent-[#315b46]" />
          </label>
          <label className="text-xs font-medium">Etiket tasarımı
            <select value={selected.labelStyle} onChange={(event) => update({ labelStyle: event.currentTarget.value as StoryMusicSelection["labelStyle"] })} className="mt-1 block h-9 w-full rounded-md border border-[#dce2dc] bg-white px-2">
              <option value="compact">Kompakt müzik etiketi</option><option value="cover">Kapak kartı</option>
            </select>
          </label>
          <label className="text-xs font-medium">Etiket konumu
            <select value={selected.labelPosition} onChange={(event) => update({ labelPosition: event.currentTarget.value as StoryMusicSelection["labelPosition"] })} className="mt-1 block h-9 w-full rounded-md border border-[#dce2dc] bg-white px-2">
              <option value="top">Üstte</option><option value="bottom">Altta</option>
            </select>
          </label>
          <label className="text-xs font-medium">Etiket boyutu
            <select value={selected.labelScale} onChange={(event) => update({ labelScale: Number(event.currentTarget.value) })} className="mt-1 block h-9 w-full rounded-md border border-[#dce2dc] bg-white px-2">
              <option value={1}>Küçük</option><option value={2}>Orta</option><option value={3}>Büyük</option>
            </select>
          </label>
        </div>
        <p className="text-[10px] text-[#788179]">Telifli tam parça saklanmaz; Apple kataloğunun önizlemesi yalnızca sen başlattığında çalar.</p>
      </div>}
      {selected && <>
        <input type="hidden" name="musicTrackId" value={selected.trackId} />
        <input type="hidden" name="musicTitle" value={selected.title} />
        <input type="hidden" name="musicArtist" value={selected.artist} />
        <input type="hidden" name="musicArtworkUrl" value={selected.artworkUrl} />
        <input type="hidden" name="musicPreviewUrl" value={selected.previewUrl} />
        <input type="hidden" name="musicTrackUrl" value={selected.trackUrl} />
        <input type="hidden" name="musicStartSeconds" value={selected.startSeconds} />
        <input type="hidden" name="musicDurationSeconds" value={selected.durationSeconds} />
        <input type="hidden" name="musicLabelStyle" value={selected.labelStyle} />
        <input type="hidden" name="musicLabelPosition" value={selected.labelPosition} />
        <input type="hidden" name="musicLabelScale" value={selected.labelScale} />
      </>}
    </section>
  );
}
