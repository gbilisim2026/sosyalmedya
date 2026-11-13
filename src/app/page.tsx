import Link from "next/link";
import { ArrowRight, Camera, Plus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visualEffectClass } from "@/lib/effects";
import { PostEngagement } from "@/app/post-engagement";
import { visibleStoriesWhere } from "@/lib/visibility";
import { PostControls } from "@/app/post-controls";
import { UserAvatar } from "@/app/user-avatar";
import { getRecommendedPosts } from "@/lib/recommendations";
import { RecommendationFeedbackButtons } from "@/app/recommendation-controls";
import { PostCarousel } from "@/app/post-carousel";
import { PostMediaInteraction } from "@/app/post-media-interaction";
import { BrandLogo } from "@/app/brand-logo";

export const instant = false;

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#f4f6f2] px-5 py-8 text-[#202522] sm:px-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo className="text-xl font-bold tracking-tight text-[#202522]" imageSize={52} />
          <Link href="/login" className="text-sm font-semibold text-[#315b46] hover:underline">
            Giriş yap
          </Link>
        </header>
        <section className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dce2dc] bg-white px-3.5 py-2 text-sm text-[#557260]">
              <Sparkles size={15} /> Kendi çevren, kendi akışın
            </p>
            <h1 className="text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
              Anlarını paylaş.
              <br />
              <span className="text-[#4f8266]">Yakın kal.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#68716b]">
              Fotoğraflarını, videolarını ve günlük hikâyelerini paylaşabileceğin sosyal alanına katıl.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#203d34] px-5 font-semibold text-white transition hover:bg-[#2c5145]"
              >
                Hesap oluştur <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-lg border border-[#cfd8d0] bg-white px-5 font-semibold text-[#315b46] transition hover:bg-[#edf2ec]"
              >
                Giriş yap
              </Link>
            </div>
          </div>
          <div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center overflow-hidden rounded-[2rem] bg-[#203d34] p-8 text-white shadow-[0_30px_80px_rgba(32,61,52,0.2)]">
            <div className="absolute -right-10 -top-8 h-56 w-56 rounded-full border-[30px] border-[#c8e9ac]/25" />
            <div className="absolute -bottom-24 -left-8 h-64 w-64 rounded-full bg-[#c8e9ac]" />
            <div className="relative z-10 flex h-full w-full flex-col justify-between rounded-[1.4rem] border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-[#c8e9ac] text-[#203d34]">
                  <Camera size={20} />
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">Paylaşım alanı</span>
              </div>
              <div>
                <p className="text-sm text-white/70">Senin hikâyen, senin akışın</p>
                <p className="mt-2 text-2xl font-semibold">İlk paylaşımın burada başlasın.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [posts, fetchedStories] = await Promise.all([
    getRecommendedPosts(currentUser.id, 20),
    prisma.story.findMany({
      where: { isArchived: false, expiresAt: { gt: new Date() }, AND: [visibleStoriesWhere(currentUser.id)] },
      include: {
        user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
        views: { where: { viewerId: currentUser.id }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const storiesByUser = new Map<string, (typeof fetchedStories)[number]>();
  for (const story of fetchedStories) {
    if (!storiesByUser.has(story.userId)) storiesByUser.set(story.userId, story);
  }
  const stories = [...storiesByUser.values()].sort((a, b) => {
    if (a.userId === currentUser.id) return -1;
    if (b.userId === currentUser.id) return 1;
    if (Boolean(a.views.length) !== Boolean(b.views.length)) return a.views.length ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const likedPostIds = new Set(
    (await prisma.like.findMany({
      where: { userId: currentUser.id, postId: { in: posts.map((post) => post.id) } },
      select: { postId: true },
    })).map((like) => like.postId),
  );
  const savedPostIds = new Set((await prisma.savedPost.findMany({
    where: { userId: currentUser.id, postId: { in: posts.map((post) => post.id) } },
    select: { postId: true },
  })).map(({ postId }) => postId));

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-[#202522]">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="mb-6">
            <p className="text-sm font-medium text-[#64806f]">Merhaba, @{currentUser.username}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Akışın</h1>
              <Link href="/stories/create" className="inline-flex items-center gap-2 rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold text-[#315b46] hover:bg-[#edf4e9]"><Plus size={15} /> Hikâye ekle</Link>
            </div>
          </div>
          <section aria-label="Aktif hikâyeler" className="story-strip mb-6 overflow-x-auto rounded-2xl border border-[#e1e6df] bg-white p-4">
            <div className="flex w-max gap-4">
              <Link href="/stories/create" className="flex w-16 flex-col items-center gap-2">
                <span className="relative grid size-14 place-items-center rounded-full border border-dashed border-[#d6d6de] bg-[#f7f7f9] text-[#555560]">
                  <UserAvatar username={currentUser.username} displayName={currentUser.username} className="size-full text-sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-white bg-[#5d4ce0] text-white"><Plus size={12} /></span>
                </span>
                <span className="w-full truncate text-center text-[11px]">Hikâyen</span>
              </Link>
              {stories.filter((story) => story.userId !== currentUser.id).map((story) => (
                <Link key={story.id} href={`/stories/${story.id}`} className="flex w-16 flex-col items-center gap-2">
                  <span className={`grid size-14 place-items-center rounded-full p-[2px] ${story.views.length ? "bg-[#d6d6de]" : "bg-gradient-to-br from-[#f7b348] via-[#ee4c78] to-[#7950da]"} ${visualEffectClass(story.visualEffect)}`}>
                    <UserAvatar {...story.user} className="size-full border-2 border-white text-sm" />
                  </span>
                  <span className="w-full truncate text-center text-[11px]">{story.user.username}</span>
                </Link>
              ))}
            </div>
          </section>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd8d0] bg-white px-6 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf4e9] text-[#4f8266]">
                <Camera size={24} />
              </span>
              <h2 className="mt-5 text-lg font-semibold">Akışın şimdilik sessiz</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68716b]">
                Henüz herkese açık bir gönderi yok. Paylaşımlar görünür olduğunda burada listelenecek.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post.id} className="feed-card overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
                  <header className="flex items-center gap-3 p-4">
                    <UserAvatar {...post.user} className="size-10 text-sm" />
                    <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="min-w-0 hover:text-[#315b46]">
                      <p className="truncate text-sm font-semibold">{post.user.displayName ?? post.user.username}</p>
                      <p className="text-xs text-[#788179]">@{post.user.username}</p>
                      {post.location && <p className="mt-0.5 truncate text-[11px] text-[#777781]">{post.location}</p>}
                    </Link>
                    <span className="ml-auto rounded-full bg-[#f1f4ef] px-2.5 py-1 text-[10px] font-medium text-[#68716b]">
                      {post.visibility === "PUBLIC" ? "Herkes" : "Takipçiler"}{post.isReel ? " · Reels" : ""}
                    </span>
                    <time className="ml-auto text-xs text-[#788179]">
                      {post.createdAt.toLocaleDateString("tr-TR")}
                    </time>
                  </header>
                  {post.sharedPost && (
                    <Link href={`/post/${post.sharedPost.id}`} className="block border-b border-[#edf0eb] px-4 py-3 hover:bg-[#f8faf7]">
                      <p className="text-xs text-[#68716b]">@{post.user.username} yeniden paylaştı · Orijinal gönderi</p>
                      <p className="mt-1 text-sm font-semibold">@{post.sharedPost.user.username}</p>
                      <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm">{post.sharedPost.caption ?? (post.sharedPost.mediaType === "VIDEO" ? "Video gönderisi" : "Fotoğraf gönderisi")}</p>
                    </Link>
                  )}
                  {post.mediaType === "VIDEO" && post.mediaUrl ? (
                    <video className={`max-h-[680px] w-full bg-black object-contain ${visualEffectClass(post.visualEffect)}`} src={post.mediaUrl} controls />
                  ) : post.mediaType === "PHOTO" && post.mediaUrl ? (
                    <PostMediaInteraction postId={post.id} liked={likedPostIds.has(post.id)}>
                      <div className={visualEffectClass(post.visualEffect)}>
                        <PostCarousel
                          images={post.mediaItems.length > 1 ? post.mediaItems.map(({ mediaUrl }) => mediaUrl) : [post.mediaUrl]}
                          caption={post.caption}
                        />
                      </div>
                    </PostMediaInteraction>
                  ) : (
                    <div className={`whitespace-pre-wrap px-5 py-8 text-lg leading-8 ${visualEffectClass(post.visualEffect)}`}>{post.caption}</div>
                  )}
                  <div className="space-y-2 p-4">
                    {post.caption && post.mediaType !== "TEXT" && <p className="text-sm leading-6">{post.caption}</p>}
                  </div>
                  <PostEngagement
                    postId={post.id}
                    likesCount={post._count.likes}
                    commentsCount={post._count.comments}
                    likedByCurrentUser={likedPostIds.has(post.id)}
                    likers={post.likes.map((like) => like.user)}
                    comments={post.comments}
                    hideLikeCount={post.hideLikeCount && post.userId !== currentUser.id}
                  />
                  <PostControls
                    postId={post.id}
                    isOwner={post.userId === currentUser.id}
                    isSaved={savedPostIds.has(post.id)}
                    isPinned={post.isPinned}
                    isFeatured={post.isFeatured}
                    isReshareAllowed={post.allowReshare}
                    allowReshare={post.allowReshare && !post.sharedPostId}
                  />
                  {post.userId !== currentUser.id && <RecommendationFeedbackButtons postId={post.id} authorId={post.userId} category={post.category} />}
                </article>
              ))}
            </div>
          )}
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-6 rounded-2xl border border-[#e1e6df] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">Hesabın</p>
            <p className="mt-2 text-sm text-[#68716b]">@{currentUser.username}</p>
            <p className="mt-4 border-t border-[#edf0eb] pt-4 text-xs leading-5 text-[#788179]">
              Gönderiler ve etkileşimler hesabına bağlı olarak saklanır. <Link href="/settings/interests" className="font-semibold text-[#557260] hover:underline">Öneri tercihlerini yönet</Link>
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
