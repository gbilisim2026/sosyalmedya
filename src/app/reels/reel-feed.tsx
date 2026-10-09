"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { VisualEffect } from "@/generated/prisma/enums";
import { visualEffectClass } from "@/lib/effects";
import { PostEngagement } from "@/app/post-engagement";

export type ReelItem = {
  id: string;
  mediaUrl: string;
  caption: string | null;
  visualEffect: VisualEffect;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  likers: { username: string; displayName: string | null }[];
  comments: { id: string; content: string; user: { username: string; displayName: string | null } }[];
  user: { username: string; displayName: string | null };
};

export function ReelFeed({ items }: { items: ReelItem[] }) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const videos = [...feed.querySelectorAll("video")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        }
      },
      { root: feed, threshold: [0, 0.65, 1] },
    );

    videos.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <h2 className="text-xl font-semibold">Henüz Reels yok</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Bir video paylaşırken Reels akışına ekle seçeneğini işaretle.</p>
          <Link href="/create" className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#c8e9ac] px-4 text-sm font-semibold text-[#203d34]">Video paylaş</Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef} className="h-[calc(100dvh-8rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain md:h-[calc(100dvh-9rem)]">
      {items.map((item) => (
        <article key={item.id} className="relative mx-auto flex h-[calc(100dvh-8rem)] max-h-[860px] w-full max-w-[480px] snap-start items-center justify-center overflow-hidden bg-black md:h-[calc(100dvh-9rem)] md:rounded-2xl">
          <video
            src={item.mediaUrl}
            muted
            loop
            playsInline
            autoPlay
            controls
            preload="metadata"
            className={`h-full w-full object-contain ${visualEffectClass(item.visualEffect)}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 pt-24 text-white">
            <Link href={`/profile/${encodeURIComponent(item.user.username)}`} className="pointer-events-auto text-sm font-semibold hover:underline">
              {item.user.displayName ?? item.user.username} · @{item.user.username}
            </Link>
            {item.caption && <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6">{item.caption}</p>}
          </div>
          <div className="absolute right-3 top-1/2 z-10 max-h-[55%] -translate-y-1/2 overflow-y-auto rounded-2xl bg-black/35 p-3 backdrop-blur-sm">
            <PostEngagement
              postId={item.id}
              likesCount={item.likesCount}
              commentsCount={item.commentsCount}
              likedByCurrentUser={item.likedByCurrentUser}
              likers={item.likers}
              comments={item.comments}
              variant="reel"
            />
          </div>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white">REELS</span>
        </article>
      ))}
    </div>
  );
}