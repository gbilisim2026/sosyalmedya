import Link from "next/link";
import { ArrowRight, Camera, Sparkles } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#f4f6f2] px-5 py-8 text-[#202522] sm:px-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            sosyal<span className="text-[#e36650]">.</span>
          </Link>
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

  const [posts, stories] = await Promise.all([
    prisma.post.findMany({
      where: {
        OR: [
          { userId: currentUser.id },
          { user: { isPrivate: false } },
          { user: { followers: { some: { followerId: currentUser.id } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: [
          { userId: currentUser.id },
          { user: { followers: { some: { followerId: currentUser.id } } } },
        ],
      },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-[#202522]">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,680px)_280px]">
        <div>
          <div className="mb-6">
            <p className="text-sm font-medium text-[#64806f]">Merhaba, @{currentUser.username}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Akışın</h1>
          </div>
          {stories.length > 0 && (
            <section aria-label="Aktif hikâyeler" className="mb-7 overflow-x-auto rounded-2xl border border-[#e1e6df] bg-white p-4">
              <div className="flex w-max gap-4">
                {stories.map((story) => (
                  <Link key={story.id} href={`/stories/${story.id}`} className="flex w-16 flex-col items-center gap-2">
                    <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#e36650] via-[#e7aa58] to-[#4f8266] p-[2px]">
                      <span className="grid size-full place-items-center rounded-full border-2 border-white bg-[#edf4e9] text-sm font-semibold text-[#315b46]">
                        {(story.user.displayName ?? story.user.username).slice(0, 1).toUpperCase()}
                      </span>
                    </span>
                    <span className="w-full truncate text-center text-[11px]">{story.user.username}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
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
                <article key={post.id} className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
                  <header className="flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9efe7] text-sm font-semibold text-[#315b46]">
                      {(post.user.displayName ?? post.user.username).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{post.user.displayName ?? post.user.username}</p>
                      <p className="text-xs text-[#788179]">@{post.user.username}</p>
                    </div>
                    <time className="ml-auto text-xs text-[#788179]">
                      {post.createdAt.toLocaleDateString("tr-TR")}
                    </time>
                  </header>
                  {post.mediaType === "VIDEO" && post.mediaUrl ? (
                    <video className="max-h-[680px] w-full bg-black object-contain" src={post.mediaUrl} controls />
                  ) : post.mediaType === "PHOTO" && post.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="max-h-[680px] w-full bg-[#f0f2ef] object-contain" src={post.mediaUrl} alt={post.caption ?? "Gönderi görseli"} />
                  ) : (
                    <div className="whitespace-pre-wrap px-5 py-8 text-lg leading-8">{post.caption}</div>
                  )}
                  <div className="space-y-2 p-4">
                    <p className="text-sm font-semibold">{post._count.likes} beğeni</p>
                    {post.caption && post.mediaType !== "TEXT" && <p className="text-sm leading-6">{post.caption}</p>}
                    <p className="text-xs text-[#788179]">{post._count.comments} yorum</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[#e1e6df] bg-white p-5">
            <p className="text-sm font-semibold">Hesabın</p>
            <p className="mt-2 text-sm text-[#68716b]">@{currentUser.username}</p>
            <p className="mt-4 border-t border-[#edf0eb] pt-4 text-xs leading-5 text-[#788179]">
              Gönderiler ve etkileşimler hesabına bağlı olarak saklanır.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
