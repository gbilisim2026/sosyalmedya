import Link from "next/link";
import { Bookmark } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";
import { toggleSavedPostAction } from "@/app/actions/social";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/app/user-avatar";
import { PostCarousel } from "@/app/post-carousel";

export const instant = false;

export default async function SavedPostsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const saved = await prisma.savedPost.findMany({
    where: { userId: user.id, post: { AND: [visiblePostsWhere(user.id)] } },
    include: {
      post: {
        include: {
          user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
          _count: { select: { likes: true, comments: true } },
          mediaItems: { orderBy: { position: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Bookmark size={21} /> Kaydedilenler</h1>
        {saved.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {saved.map(({ post }) => <article key={post.id} className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
            <Link href={`/post/${post.id}`} className="block p-4 hover:bg-[#fbfcfa]">
              <span className="flex items-center gap-2 text-sm font-semibold hover:underline"><UserAvatar {...post.user} className="size-8" />@{post.user.username}</span>
              {post.mediaType === "PHOTO" && post.mediaUrl && <div className="mt-3 overflow-hidden rounded-xl"><PostCarousel images={post.mediaItems.length > 1 ? post.mediaItems.map(({ mediaUrl }) => mediaUrl) : [post.mediaUrl]} caption={post.caption} /></div>}
              {post.mediaType === "VIDEO" && post.mediaUrl && <video src={post.mediaUrl} muted playsInline preload="metadata" className="mt-3 max-h-80 w-full rounded-xl bg-black object-contain" />}
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-[#526058]">{post.caption || (post.mediaType === "VIDEO" ? "Video gönderisi" : "Fotoğraf gönderisi")}</p>
              <p className="mt-3 text-xs text-[#788179]">{post._count.likes} beğeni · {post._count.comments} yorum · Gönderiyi aç →</p>
            </Link>
            <form action={toggleSavedPostAction.bind(null, post.id)} className="p-4 pt-0">
              <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Kaydedilenlerden kaldır</button>
            </form>
          </article>)}
        </div> : <p className="mt-5 rounded-2xl border border-dashed border-[#d5ddd4] bg-white px-5 py-12 text-center text-sm text-[#788179]">Henüz kaydedilmiş gönderi yok.</p>}
      </section>
    </main>
  );
}
