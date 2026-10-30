"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export function StoryMusicPlayer({
  title,
  artist,
  artworkUrl,
  trackUrl,
  previewUrl,
  startSeconds,
  durationSeconds,
  labelStyle,
  labelPosition,
  labelScale,
}: {
  title: string;
  artist: string;
  artworkUrl: string;
  trackUrl: string;
  previewUrl: string;
  startSeconds: number;
  durationSeconds: number;
  labelStyle: string | null;
  labelPosition: string | null;
  labelScale: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const stopAtClipEnd = () => {
      if (audio.currentTime >= stopAtRef.current) {
        audio.pause();
        setPlaying(false);
      }
    };
    audio.addEventListener("timeupdate", stopAtClipEnd);
    return () => audio.removeEventListener("timeupdate", stopAtClipEnd);
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    stopAtRef.current = startSeconds + durationSeconds;
    if (audio.currentTime < startSeconds || audio.currentTime >= stopAtRef.current) audio.currentTime = startSeconds;
    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error("Could not play licensed music preview.", error);
    }
  }

  const scale = labelScale === 2 ? "text-base" : labelScale === 3 ? "text-lg" : "text-sm";
  return (
    <div className={`absolute inset-x-4 z-10 flex justify-center ${labelPosition === "top" ? "top-8" : "bottom-24"}`}>
      <audio ref={audioRef} src={previewUrl} preload="none" onEnded={() => setPlaying(false)} />
      <div className={`flex max-w-full items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-white shadow-lg backdrop-blur ${scale}`}>
        {labelStyle === "cover" && <Image src={artworkUrl} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-md object-cover" />}
        <button type="button" onClick={() => void togglePlayback()} className="min-w-0 text-left">
          <span className="block truncate font-semibold">{labelStyle === "cover" ? "" : "♫  "}{title}</span>
          <span className="block truncate text-[0.75em] text-white/75">{artist} · {playing ? "Durdur" : "Dinle"}</span>
        </button>
        <a href={trackUrl} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] underline">Apple</a>
      </div>
    </div>
  );
}
