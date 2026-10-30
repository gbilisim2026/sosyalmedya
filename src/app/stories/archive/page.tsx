import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteStoryAction, reshareArchivedStoryAction } from "@/app/actions/social";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { archiveExpiredStories } from "@/lib/story-archive";

export const instant = false;

export default async function StoryArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await archiveExpiredStories();

  const stories = await prisma.story.findMany({
    where: { userId: user.id, isArchived: true },
    include: { _count: { select: { views: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href={`/profile/${encodeURIComponent(user.username)}`} className="text-sm text-[#557260] hover:underline">← Profile dön</Link>
        <h1 className="mt-4 text-2xl font-semibold">Hikâye Arşivi</h1>
        <p className="mt-2 text-sm text-[#68716b]">Yalnızca senin görebildiğin, süresi dolmuş hikâyelerin.</p>
        {stories.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stories.map((story) => <article key={story.id} className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
            <Link href={`/stories/${story.id}`} className="relative block aspect-[3/4] bg-[#18231d]">
              {story.mediaType === "VIDEO"
                ? <video src={story.mediaUrl} muted playsInline className="size-full object-contain" />
                : <Image src={story.mediaUrl} alt={story.caption ?? "Arşivlenmiş hikâye"} fill sizes="(max-width: 640px) 50vw, 25vw" unoptimized className="object-contain" />}
              {story.caption && <span className="absolute inset-x-2 bottom-2 line-clamp-3 rounded-lg bg-black/55 px-2 py-1 text-center text-xs text-white">{story.caption}</span>}
            </Link>
            <div className="space-y-2 p-3">
              <p className="text-xs text-[#68716b]">
                {story.createdAt.toLocaleDateString("tr-TR")} · {story.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                <span className="block">{story._count.views} benzersiz izleyici</span>
              </p>
              <Link href={`/stories/${story.id}`} className="block text-xs font-semibold text-[#557260] hover:underline">İzlenmeleri gör</Link>
              <form action={reshareArchivedStoryAction.bind(null, story.id)}>
                <button className="w-full rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white">Yeniden paylaş</button>
              </form>
              <form action={deleteStoryAction.bind(null, story.id)}>
                <button className="w-full rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold text-[#8b4236]">Arşivden sil</button>
              </form>
            </div>
          </article>)}
        </div> : <p className="mt-6 rounded-2xl border border-dashed border-[#d5ddd4] bg-white px-5 py-12 text-center text-sm text-[#788179]">Arşivlenmiş hikâyen yok.</p>}
      </section>
    </main>
  );
}
