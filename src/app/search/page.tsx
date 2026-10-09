import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const instant = false;

type SearchPageProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const normalized = query.toLowerCase();

  const [people, posts, hashtags] = query.length > 0
    ? await Promise.all([
        prisma.user.findMany({
          where: {
            id: { not: currentUser.id },
            OR: [
              { usernameKey: { contains: normalized } },
              { displayName: { contains: query } },
            ],
          },
          select: { username: true, displayName: true, bio: true, avatarUrl: true },
          take: 12,
          orderBy: { createdAt: "desc" },
        }),
        prisma.post.findMany({
          where: {
            AND: [
              { caption: { contains: query } },
              {
                OR: [
                  { userId: currentUser.id },
                  { user: { isPrivate: false } },
                  { user: { followers: { some: { followerId: currentUser.id } } } },
                ],
              },
            ],
          },
          include: { user: { select: { username: true, displayName: true } } },
          orderBy: { createdAt: "desc" },
          take: 18,
        }),
        prisma.hashtag.findMany({
          where: { tagKey: { contains: normalized.replace(/^#/, "") } },
          include: { _count: { select: { posts: true } } },
          take: 12,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], []];

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold">Ara</h1>
        <form action="/search" className="mt-5 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Kişi, gönderi veya #hashtag ara"
            className="h-12 min-w-0 flex-1 rounded-lg border border-[#dce2dc] bg-white px-4 outline-none focus:border-[#4f8266] focus:ring-2 focus:ring-[#4f8266]/15"
          />
          <button className="h-12 rounded-lg bg-[#203d34] px-5 font-semibold text-white hover:bg-[#2c5145]">Ara</button>
        </form>
        {!query ? (
          <p className="mt-8 text-sm text-[#68716b]">Kullanıcı adı, gönderi metni veya hashtag arayabilirsin.</p>
        ) : (
          <div className="mt-8 space-y-9">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#68716b]">Kişiler</h2>
              {people.length ? <div className="mt-3 divide-y divide-[#e8ece6] rounded-xl border border-[#e1e6df] bg-white px-4">
                {people.map((person) => <Link key={person.username} href={`/profile/${encodeURIComponent(person.username)}`} className="flex items-center gap-3 py-3 hover:text-[#315b46]">
                  <span className="grid size-10 place-items-center rounded-full bg-[#e9efe7] font-semibold text-[#315b46]">{(person.displayName ?? person.username).slice(0, 1).toUpperCase()}</span>
                  <span><span className="block text-sm font-semibold">{person.displayName ?? person.username}</span><span className="text-xs text-[#788179]">@{person.username}</span></span>
                </Link>)}
              </div> : <p className="mt-3 text-sm text-[#788179]">Kişi bulunamadı.</p>}
            </section>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#68716b]">Hashtag’ler</h2>
              {hashtags.length ? <div className="mt-3 flex flex-wrap gap-2">
                {hashtags.map((tag) => <span key={tag.id} className="rounded-full border border-[#dce2dc] bg-white px-3 py-2 text-sm"><b>#{tag.name}</b> <span className="text-[#788179]">{tag._count.posts}</span></span>)}
              </div> : <p className="mt-3 text-sm text-[#788179]">Hashtag bulunamadı.</p>}
            </section>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#68716b]">Gönderiler</h2>
              {posts.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {posts.map((post) => <article key={post.id} className="rounded-xl border border-[#e1e6df] bg-white p-4">
                  <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="text-xs font-semibold text-[#557260]">@{post.user.username}</Link>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{post.caption || "Medya gönderisi"}</p>
                </article>)}
              </div> : <p className="mt-3 text-sm text-[#788179]">Gönderi bulunamadı.</p>}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}