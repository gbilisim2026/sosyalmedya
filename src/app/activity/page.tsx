import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";
import {
  deleteActivityCommentAction,
  deleteActivityFollowAction,
  deleteActivityEventAction,
  deleteActivityLikeAction,
  deleteActivityReshareAction,
} from "@/app/actions/social";

export const instant = false;

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [likes, comments, reshares, follows, followHistory] = await Promise.all([
    prisma.like.findMany({
      where: { userId: user.id, post: { AND: [visiblePostsWhere(user.id)] } },
      include: { post: { select: { id: true, caption: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.comment.findMany({
      where: { userId: user.id, post: { AND: [visiblePostsWhere(user.id)] } },
      include: { post: { select: { id: true, caption: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.post.findMany({
      where: { userId: user.id, sharedPostId: { not: null }, sharedPost: { is: { AND: [visiblePostsWhere(user.id)] } } },
      include: { sharedPost: { select: { id: true, caption: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.userActivity.findMany({
      where: { userId: user.id },
      include: { targetUser: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold">Hareketlerin</h1>
        <p className="mt-2 text-sm text-[#68716b]">Hesabındaki son etkileşimleri görebilir ve kendi kayıtlarını silebilirsin.</p>
        <section className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Beğendiklerin</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {likes.map((like) => <div key={like.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm">Gönderini beğendin: <Link href={`/post/${like.post.id}`} className="font-semibold hover:underline">@{like.post.user.username} · {like.post.caption || "Gönderi"}</Link></p>
              <form action={deleteActivityLikeAction.bind(null, like.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Kaydı sil</button></form>
            </div>)}
            {likes.length === 0 && <p className="py-4 text-sm text-[#788179]">Henüz etkileşim yok.</p>}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Yorumların</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {comments.map((comment) => <div key={comment.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm"><Link href={`/post/${comment.post.id}`} className="font-semibold hover:underline">@{comment.post.user.username}</Link> gönderisine: {comment.content || "GIF"}</p>
              <form action={deleteActivityCommentAction.bind(null, comment.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Yorumu sil</button></form>
            </div>)}
            {comments.length === 0 && <p className="py-4 text-sm text-[#788179]">Henüz yorum yok.</p>}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Yeniden paylaşımların</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {reshares.map((post) => <div key={post.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm"><Link href={`/post/${post.sharedPost?.id}`} className="font-semibold hover:underline">@{post.sharedPost?.user.username}</Link> · {post.sharedPost?.caption || "Gönderi"}</p>
              <form action={deleteActivityReshareAction.bind(null, post.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Paylaşımı kaldır</button></form>
            </div>)}
            {reshares.length === 0 && <p className="py-4 text-sm text-[#788179]">Henüz yeniden paylaşım yok.</p>}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Takip geçmişi</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {followHistory.map((event) => <div key={event.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm">{event.action === "FOLLOWED" ? "Takip etmeye başladın:" : "Takibi bıraktın:"} <Link href={`/profile/${encodeURIComponent(event.targetUser.username)}`} className="font-semibold hover:underline">@{event.targetUser.username}</Link></p>
              <time className="text-xs text-[#788179]">{event.createdAt.toLocaleDateString("tr-TR")}</time>
              <form action={deleteActivityEventAction.bind(null, event.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Kaydı sil</button></form>
            </div>)}
            {followHistory.length === 0 && <p className="py-4 text-sm text-[#788179]">Takip geçmişi yok.</p>}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Takip ettiklerin</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {follows.map((follow) => <div key={follow.id} className="flex items-center gap-3 py-3">
              <Link href={`/profile/${encodeURIComponent(follow.following.username)}`} className="min-w-0 flex-1 text-sm font-semibold hover:underline">@{follow.following.username} · {follow.following.displayName ?? ""}</Link>
              <time className="text-xs text-[#788179]">{follow.createdAt.toLocaleDateString("tr-TR")}</time>
              <form action={deleteActivityFollowAction.bind(null, follow.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Takibi bırak</button></form>
            </div>)}
            {follows.length === 0 && <p className="py-4 text-sm text-[#788179]">Henüz takip edilen hesap yok.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
