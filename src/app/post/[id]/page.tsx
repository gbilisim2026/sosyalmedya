import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { PostEngagement } from "@/app/post-engagement";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";
import { visualEffectClass } from "@/lib/effects";

export const instant = false;

type PostPageProps = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: PostPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { AND: [{ id }, visiblePostsWhere(user.id)] },
    include: {
      user: { select: { username: true, displayName: true } },
      _count: { select: { likes: true, comments: true } },
      likes: {
        orderBy: { createdAt: "desc" },
        select: { user: { select: { username: true, displayName: true } } },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, user: { select: { username: true, displayName: true } } },
      },
    },
  });
  if (!post) notFound();

  const likedByCurrentUser = post.likes.some((like) => like.user.username === user.username);

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="mb-4 inline-block text-sm font-semibold text-[#557260] hover:underline">
          ← @{post.user.username}
        </Link>
        <article className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
          <header className="flex items-center gap-3 p-4">
            <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="grid size-10 place-items-center rounded-full bg-[#e9efe7] font-semibold text-[#315b46]">
              {(post.user.displayName ?? post.user.username).slice(0, 1).toUpperCase()}
            </Link>
            <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="text-sm font-semibold hover:underline">@{post.user.username}</Link>
            <span className="ml-auto text-xs text-[#788179]">{post.visibility === "PUBLIC" ? "Herkese açık" : "Takipçilere özel"}{post.isReel ? " · Reels" : ""}</span>
          </header>
          {post.mediaType === "PHOTO" && post.mediaUrl ? (
            <div className={`relative aspect-[4/5] max-h-[78vh] bg-[#edf0eb] ${visualEffectClass(post.visualEffect)}`}>
              <Image src={post.mediaUrl} alt={post.caption ?? "Gönderi"} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" />
            </div>
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
          />
        </article>
      </section>
    </main>
  );
}