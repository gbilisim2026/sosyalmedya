import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { archivePostAction } from "@/app/actions/social";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";

export const instant = false;

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const posts = await prisma.post.findMany({
    where: {
      userId: user.id,
      isArchived: true,
      OR: [
        { sharedPostId: null },
        { sharedPost: { is: { AND: [visiblePostsWhere(user.id)] } } },
      ],
    },
    include: { _count: { select: { likes: true, comments: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold">Arşiv</h1>
        <p className="mt-1 text-sm text-[#68716b]">Bu gönderileri yalnızca sen görebilirsin.</p>
        {posts.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {posts.map((post) => <article key={post.id} className="rounded-2xl border border-[#e1e6df] bg-white p-4">
            <p className="line-clamp-4 whitespace-pre-wrap text-sm">{post.caption || (post.mediaType === "VIDEO" ? "Video gönderisi" : "Fotoğraf gönderisi")}</p>
            <p className="mt-3 text-xs text-[#788179]">{post._count.likes} beğeni · {post._count.comments} yorum</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/post/${post.id}`} className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Gönderiyi aç</Link>
              <form action={archivePostAction.bind(null, post.id, false)}>
                <button className="rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white">Profile geri ekle</button>
              </form>
            </div>
          </article>)}
        </div> : <p className="mt-5 rounded-2xl border border-dashed border-[#d5ddd4] bg-white px-5 py-12 text-center text-sm text-[#788179]">Arşivde gönderi yok.</p>}
      </section>
    </main>
  );
}
