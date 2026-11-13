import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { PostEngagement } from "@/app/post-engagement";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";
import { visualEffectClass } from "@/lib/effects";
import { PostControls } from "@/app/post-controls";
import { editPostAction, updateContentAudienceAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";
import { recommendationCategories } from "@/lib/recommendation-categories";
import { recordPostViewAction } from "@/app/actions/social";
import { PostCarousel } from "@/app/post-carousel";
import { PostMediaInteraction } from "@/app/post-media-interaction";

export const instant = false;

type PostPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; edit?: string; updated?: string }> };

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const post = await prisma.post.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id, sharedPostId: null },
        { AND: [visiblePostsWhere(user.id)] },
      ],
    },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      sharedPost: { include: { user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } }, mediaItems: { orderBy: { position: "asc" } } } },
      _count: { select: { likes: true, comments: true } },
      mediaItems: { orderBy: { position: "asc" } },
      likes: {
        orderBy: { createdAt: "desc" },
        select: { user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } } },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, gifUrl: true, gifLicense: true, gifAttributionUrl: true, user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } } },
      },
    },
  });
  if (!post) notFound();
  if (post.sharedPostId === null && post.caption === null && post.mediaUrl === null) notFound();
  if (post.mediaType === "VIDEO") await recordPostViewAction(post.id);

  const likedByCurrentUser = post.likes.some((like) => like.user.username === user.username);
  const isSaved = Boolean(await prisma.savedPost.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    select: { id: true },
  }));
  const selectedAudience = post.userId === user.id
    ? await prisma.postAudience.findMany({
        where: { postId: post.id },
        include: { user: { select: { username: true } } },
      })
    : [];

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="mb-4 inline-block text-sm font-semibold text-[#557260] hover:underline">
          ← @{post.user.username}
        </Link>
        {query.error === "audience" && <p role="alert" className="mb-3 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Hedef kitle geçersiz veya seçilen kullanıcılardan biri bulunamadı.</p>}
        {query.error === "edit" && <p role="alert" className="mb-3 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Gönderi güncellenemedi; alan uzunluklarını kontrol et.</p>}
        {query.updated && <p role="status" className="mb-3 rounded-lg bg-[#edf4e9] p-3 text-sm text-[#315b46]">Gönderi güncellendi.</p>}
        <article className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
          <header className="flex items-center gap-3 p-4">
            <Link href={`/profile/${encodeURIComponent(post.user.username)}`}><UserAvatar {...post.user} className="size-10" /></Link>
            <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="text-sm font-semibold hover:underline">@{post.user.username}</Link>
            <span className="ml-auto text-right text-xs text-[#788179]">{post.location && <span className="mb-1 block">{post.location}</span>}{post.visibility === "PUBLIC" ? "Herkese açık" : "Takipçilere özel"}{post.isReel ? " · Reels" : ""}</span>
          </header>
          {post.sharedPost && <Link href={`/post/${post.sharedPost.id}`} className="block border-y border-[#edf0eb] bg-[#fbfcfa] px-5 py-4 hover:bg-[#f1f4ef]">
            <p className="text-xs text-[#68716b]">@{post.user.username} yeniden paylaştı · Orijinal içerik</p>
            <p className="mt-1 text-sm font-semibold">@{post.sharedPost.user.username}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{post.sharedPost.caption ?? "Paylaşılan gönderi"}</p>
            <span className="mt-2 inline-block text-xs font-semibold text-[#557260]">Orijinal gönderiyi görüntüle →</span>
          </Link>}
          {post.sharedPost?.mediaType === "PHOTO" && post.sharedPost.mediaUrl && <PostCarousel images={post.sharedPost.mediaItems.length > 1 ? post.sharedPost.mediaItems.map(({ mediaUrl }) => mediaUrl) : [post.sharedPost.mediaUrl]} caption={post.sharedPost.caption} />}
          {post.sharedPost?.mediaType === "VIDEO" && post.sharedPost.mediaUrl && <video src={post.sharedPost.mediaUrl} controls playsInline className="max-h-[78vh] w-full bg-black object-contain" />}
          {post.sharedPost?.caption && <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-6">{post.sharedPost.caption}</p>}
          {post.mediaType === "PHOTO" && post.mediaUrl ? (
            <PostMediaInteraction postId={post.id} liked={likedByCurrentUser}>
              <div className={visualEffectClass(post.visualEffect)}>
                <PostCarousel images={post.mediaItems.length > 1 ? post.mediaItems.map(({ mediaUrl }) => mediaUrl) : [post.mediaUrl]} caption={post.caption} />
              </div>
            </PostMediaInteraction>
          ) : post.mediaType === "VIDEO" && post.mediaUrl ? (
            <video src={post.mediaUrl} controls playsInline className={`max-h-[78vh] w-full bg-black object-contain ${visualEffectClass(post.visualEffect)}`} />
          ) : (
            <p className={`whitespace-pre-wrap px-6 py-10 text-lg leading-8 ${visualEffectClass(post.visualEffect)}`}>{post.caption}</p>
          )}
          {post.caption && post.mediaType !== "TEXT" && <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-6">{post.caption}</p>}
          <PostEngagement
            postId={post.id}
            likesCount={post._count.likes}
            commentsCount={post._count.comments}
            likedByCurrentUser={likedByCurrentUser}
            likers={post.likes.map((like) => like.user)}
            comments={post.comments}
            hideLikeCount={post.hideLikeCount && post.userId !== user.id}
          />
          <PostControls
            postId={post.id}
            isOwner={post.userId === user.id}
            isSaved={isSaved}
            isPinned={post.isPinned}
            isFeatured={post.isFeatured}
            isArchived={post.isArchived}
            isReshareAllowed={post.allowReshare}
            allowReshare={post.allowReshare && !post.sharedPostId}
            hideLikeCount={post.hideLikeCount}
          />
          {post.userId === user.id && !post.sharedPostId && <div className="border-t border-[#edf0eb] px-4 py-3">
            {query.edit === "1" ? <form action={editPostAction.bind(null, post.id)} className="space-y-3">
              <label className="block text-xs font-semibold">Açıklama
                <textarea name="caption" maxLength={2200} defaultValue={post.caption ?? ""} rows={4} className="mt-1 block w-full rounded-lg border border-[#dce2dc] p-3 text-sm font-normal" />
              </label>
              <label className="block text-xs font-semibold">Konum
                <input name="location" maxLength={160} defaultValue={post.location ?? ""} className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] px-3 text-sm font-normal" />
              </label>
              <label className="block text-xs font-semibold">İçerik kategorisi
                <select name="category" defaultValue={post.category ?? ""} className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] bg-white px-3 text-sm font-normal">
                  <option value="">Kategori seçme</option>
                  {recommendationCategories.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div className="flex gap-2"><button className="rounded-lg bg-[#203d34] px-4 py-2 text-xs font-semibold text-white">Değişiklikleri kaydet</button><Link href={`/post/${post.id}`} className="rounded-lg border border-[#dce2dc] px-4 py-2 text-xs font-semibold">Vazgeç</Link></div>
            </form> : <Link href={`/post/${post.id}?edit=1`} className="text-xs font-semibold text-[#557260] hover:underline">Gönderiyi düzenle</Link>}
          </div>}
          {post.userId === user.id && !post.sharedPostId && <form action={updateContentAudienceAction.bind(null, "post", post.id)} className="flex flex-wrap items-end gap-3 border-t border-[#edf0eb] bg-[#fbfcfa] p-4">
            <label className="text-xs font-semibold">Gönderi hedef kitlesi
              <select name="audience" defaultValue={post.audience} className="mt-1 block h-10 rounded-lg border border-[#dce2dc] bg-white px-2">
                <option value="EVERYONE">Herkes</option><option value="FOLLOWERS">Takipçiler</option><option value="CLOSE_FRIENDS">Yakın arkadaşlar</option><option value="SELECTED">Belirli kişiler</option>
              </select>
            </label>
            <label className="min-w-52 flex-1 text-xs font-semibold">Belirli kullanıcı adları
              <input name="selectedUsernames" defaultValue={selectedAudience.map(({ user }) => user.username).join(", ")} className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] px-2 font-normal" placeholder="@kullanici1, kullanici2" />
            </label>
            <button className="h-10 rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white">Gizliliği güncelle</button>
          </form>}
        </article>
      </section>
    </main>
  );
}