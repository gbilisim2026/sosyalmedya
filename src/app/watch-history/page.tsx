import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere, visibleStoriesWhere } from "@/lib/visibility";
import { deletePostViewAction, deleteStoryViewAction } from "@/app/actions/social";

export const instant = false;

export default async function WatchHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [posts, stories] = await Promise.all([
    prisma.postView.findMany({
      where: { viewerId: user.id, hiddenFromHistory: false, post: { AND: [visiblePostsWhere(user.id)] } },
      include: { post: { select: { id: true, caption: true, mediaType: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.storyView.findMany({
      where: { viewerId: user.id, hiddenFromHistory: false, story: { OR: [{ userId: user.id }, { expiresAt: { gt: new Date() } }], AND: [visibleStoriesWhere(user.id)] } },
      include: { story: { select: { id: true, caption: true, mediaType: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold">İzleme geçmişi</h1>
        <p className="mt-2 text-sm text-[#68716b]">Geçmişini yalnızca sen görebilirsin. Buradan kaldırdığın kayıtlar kişisel geçmişinden gizlenir; içerik sahiplerinin toplam izlenme istatistikleri korunur.</p>
        <section className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Videolar ve Reels</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {posts.map((entry) => <div key={entry.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm"><Link href={`/post/${entry.post.id}`} className="font-semibold hover:underline">@{entry.post.user.username}</Link> · {entry.post.caption || (entry.post.mediaType === "VIDEO" ? "Video" : "İçerik")}</p>
              <time className="text-xs text-[#788179]">{entry.createdAt.toLocaleString("tr-TR")}</time>
              <form action={deletePostViewAction.bind(null, entry.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Sil</button></form>
            </div>)}
            {posts.length === 0 && <p className="py-4 text-sm text-[#788179]">Video izleme kaydı yok.</p>}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <h2 className="font-semibold">Hikâyeler</h2>
          <div className="mt-2 divide-y divide-[#edf0eb]">
            {stories.map((entry) => <div key={entry.id} className="flex items-center gap-3 py-3">
              <p className="min-w-0 flex-1 text-sm"><Link href={`/stories/${entry.story.id}`} className="font-semibold hover:underline">@{entry.story.user.username}</Link> · {entry.story.caption || "Hikâye"}</p>
              <time className="text-xs text-[#788179]">{entry.createdAt.toLocaleString("tr-TR")}</time>
              <form action={deleteStoryViewAction.bind(null, entry.id)}><button className="text-xs font-semibold text-[#8b4236] hover:underline">Sil</button></form>
            </div>)}
            {stories.length === 0 && <p className="py-4 text-sm text-[#788179]">Hikâye izleme kaydı yok.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
