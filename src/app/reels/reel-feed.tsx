"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { VisualEffect } from "@/generated/prisma/enums";
import { visualEffectClass } from "@/lib/effects";
import { PostEngagement } from "@/app/post-engagement";
import { recordPostViewAction, recordVideoWatchDurationAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";
import { PostControls } from "@/app/post-controls";
import { RecommendationFeedbackButtons } from "@/app/recommendation-controls";

export type ReelItem = {
  id: string;
  mediaUrl: string;
  caption: string | null;
  visualEffect: VisualEffect;
  likesCount: number;
  commentsCount: number;
  hideLikeCount: boolean;
  viewsCount: number;
  uniqueViewers: number;
  viewers: { username: string; displayName: string | null }[];
  isOwner: boolean;
  isSaved: boolean;
  userId: string;
  category: string | null;
  allowReshare: boolean;
  likedByCurrentUser: boolean;
  likers: { username: string; displayName: string | null; avatarUrl: string | null; avatarScale: number; avatarOffsetX: number; avatarOffsetY: number }[];
  comments: { id: string; content: string; gifUrl: string | null; gifLicense: string | null; gifAttributionUrl: string | null; user: { username: string; displayName: string | null; avatarUrl: string | null; avatarScale: number; avatarOffsetX: number; avatarOffsetY: number } }[];
  user: { username: string; displayName: string | null; avatarUrl: string | null; avatarScale: number; avatarOffsetX: number; avatarOffsetY: number };
};

export function ReelFeed({ items }: { items: ReelItem[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const watchProgress = useRef(new Map<string, { lastTime: number; pendingMs: number }>());

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
            onPlay={() => {
              void recordPostViewAction(item.id).catch((error: unknown) => {
                console.error("Could not record reel view", error);
              });
            }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              const progress = watchProgress.current.get(item.id);
              if (!progress) {
                watchProgress.current.set(item.id, { lastTime: video.currentTime, pendingMs: 0 });
                return;
              }
              const elapsedMs = Math.max(0, Math.min(3000, (video.currentTime - progress.lastTime) * 1000));
              progress.lastTime = video.currentTime;
              progress.pendingMs += elapsedMs;
              if (progress.pendingMs >= 10_000) {
                const watchedMs = Math.min(progress.pendingMs, 15_000);
                progress.pendingMs = 0;
                void recordVideoWatchDurationAction(item.id, watchedMs).catch((error: unknown) => {
                  console.error("Could not record reel watch duration", error);
                });
              }
            }}
            onPause={() => {
              const progress = watchProgress.current.get(item.id);
              if (progress?.pendingMs) {
                const watchedMs = Math.min(progress.pendingMs, 15_000);
                progress.pendingMs = 0;
                void recordVideoWatchDurationAction(item.id, watchedMs).catch((error: unknown) => {
                  console.error("Could not record reel watch duration", error);
                });
              }
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 pt-24 text-white">
            <Link href={`/profile/${encodeURIComponent(item.user.username)}`} className="pointer-events-auto text-sm font-semibold hover:underline">
              <span className="flex items-center gap-2"><UserAvatar {...item.user} className="size-9 border border-white/40" />{item.user.displayName ?? item.user.username} · @{item.user.username}</span>
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
              hideLikeCount={item.hideLikeCount && !item.isOwner}
            />
          </div>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white">REELS</span>
          <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white">{item.viewsCount} görüntülenme</span>
          <Link href={`/post/${item.id}`} className="absolute bottom-4 right-4 z-10 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white hover:bg-black/75">Gönderi ayrıntıları</Link>
          <div className="absolute bottom-14 left-3 right-3 z-10 rounded-xl bg-black/45 text-white backdrop-blur-sm">
            <PostControls postId={item.id} isOwner={item.isOwner} isSaved={item.isSaved} allowReshare={!item.isOwner && item.allowReshare} isReshareAllowed={item.allowReshare} />
            {!item.isOwner && <RecommendationFeedbackButtons postId={item.id} authorId={item.userId} category={item.category} />}
          </div>
          {item.isOwner && <div className="absolute left-4 top-14 z-10 max-w-48 rounded-xl bg-black/65 p-3 text-xs text-white">
            <p className="font-semibold">{item.uniqueViewers} benzersiz izleyici</p>
            <div className="mt-1 flex flex-wrap gap-1">{item.viewers.map((viewer) =>
              <Link key={viewer.username} href={`/profile/${encodeURIComponent(viewer.username)}`} className="underline">@{viewer.username}</Link>
            )}</div>
          </div>}
        </article>
      ))}
    </div>
  );
}