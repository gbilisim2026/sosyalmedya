"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type StoryPlaybackProps = {
  active: boolean;
  isVideo: boolean;
  previousHref: string | null;
  nextHref: string;
  children: ReactNode;
};

const PHOTO_DURATION_MS = 7000;

export function StoryPlayback({ active, isVideo, previousHref, nextHref, children }: StoryPlaybackProps) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const navigatedRef = useRef(false);
  const videoWasPlayingRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const navigate = useCallback((href: string) => {
    navigatedRef.current = true;
    router.push(href);
  }, [router]);

  useEffect(() => {
    if (!active || isVideo || navigatedRef.current) return;
    const timer = window.setInterval(() => {
      if (paused) return;
      elapsedRef.current += 80;
      const nextProgress = Math.min(100, (elapsedRef.current / PHOTO_DURATION_MS) * 100);
      setProgress(nextProgress);
      if (nextProgress >= 100) navigate(nextHref);
    }, 80);
    return () => window.clearInterval(timer);
  }, [active, isVideo, nextHref, navigate, paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && previousHref) navigate(previousHref);
      if (event.key === "ArrowRight") navigate(nextHref);
      if (event.key === " " && active && !isVideo) {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, isVideo, navigate, nextHref, previousHref]);

  const pausePlayback = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || (event.target as HTMLElement).closest("button, a, input, textarea")) return;
    setPaused(true);
    const video = frameRef.current?.querySelector("video");
    videoWasPlayingRef.current = Boolean(video && !video.paused);
    video?.pause();
  };

  const resumePlayback = () => {
    if (!active) return;
    setPaused(false);
    const video = frameRef.current?.querySelector("video");
    if (videoWasPlayingRef.current) void video?.play();
    videoWasPlayingRef.current = false;
  };

  const updateVideoProgress = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!isVideo || !(event.target instanceof HTMLVideoElement) || !Number.isFinite(event.target.duration)) return;
    const video = event.target;
    setProgress(video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0);
    if (video.ended && !navigatedRef.current) navigate(nextHref);
  };

  return (
    <div
      ref={frameRef}
      className="story-playback"
      onPointerDown={pausePlayback}
      onPointerUp={resumePlayback}
      onPointerCancel={resumePlayback}
      onPointerLeave={resumePlayback}
      onTimeUpdateCapture={updateVideoProgress}
      onLoadedMetadataCapture={updateVideoProgress}
      aria-label={paused ? "Hikâye duraklatıldı" : "Hikâye oynatılıyor"}
    >
      {active && <div className="story-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>}
      {children}
      {active && (
        <div className="story-tap-zones">
          {previousHref && <button type="button" aria-label="Önceki hikâye" onClick={() => navigate(previousHref)}><ChevronLeft size={23} /></button>}
          <button type="button" aria-label="Sonraki hikâye" onClick={() => navigate(nextHref)}><ChevronRight size={23} /></button>
        </div>
      )}
      {active && paused && <span className="story-paused-label" role="status">Duraklatıldı</span>}
    </div>
  );
}
