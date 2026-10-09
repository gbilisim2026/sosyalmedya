import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { ReelFeed } from "@/app/reels/reel-feed";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";

export const instant = false;

export default async function ReelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const posts = await prisma.post.findMany({
    where: {
      AND: [
        visiblePostsWhere(user.id),
        { isReel: true, mediaType: "VIDEO", mediaUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      mediaUrl: true,
      caption: true,
      visualEffect: true,
      user: { select: { username: true, displayName: true } },
      likes: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { user: { select: { username: true, displayName: true } } },
      },
      comments: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, user: { select: { username: true, displayName: true } } },
      },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
      take: 30,
  });

  const likedPostIds = new Set(
    (await prisma.like.findMany({
      where: { userId: user.id, postId: { in: posts.map((post) => post.id) } },
      select: { postId: true },
    })).map((like) => like.postId),
  );

  return (
    <main className="min-h-screen bg-[#101512] pb-16 text-white md:pb-0">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-5xl px-0 py-3 sm:px-5 md:py-5">
        <div className="mb-3 flex items-center justify-between px-5 md:px-0">
          <h1 className="text-lg font-semibold">Reels</h1>
          <Link href="/create?reel=1" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#c8e9ac] px-3 text-sm font-semibold text-[#203d34] transition hover:bg-[#dbf2c7]">
            <Plus size={17} /> Reels ekle
          </Link>
        </div>
        <ReelFeed items={posts.flatMap((post) => post.mediaUrl ? [{
          ...post,
          mediaUrl: post.mediaUrl,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          likedByCurrentUser: likedPostIds.has(post.id),
          likers: post.likes.map((like) => like.user),
        }] : [])} />
      </section>
    </main>
  );
}