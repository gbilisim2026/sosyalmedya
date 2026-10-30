import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { getRecommendedPosts, getSuggestedPeople } from "@/lib/recommendations";
import { FollowSuggestionButton } from "@/app/profile/[username]/profile-actions";
import { UserAvatar } from "@/app/user-avatar";
import { prisma } from "@/lib/prisma";
import { recommendationCategories } from "@/lib/recommendation-categories";
import { ExternalVideoExplorer } from "@/app/explore/external-video-explorer";
import { DismissSuggestionButton, RecommendationFeedbackButtons } from "@/app/recommendation-controls";

export const instant = false;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const category = recommendationCategories.some((item) => item.value === params.category) ? params.category! : null;
  const page = Math.min(3, Math.max(0, Number(params.page ?? 0) || 0));
  const [posts, people, preferences] = await Promise.all([
    getRecommendedPosts(user.id, 40, category, page * 40),
    getSuggestedPeople(user.id, user.id, 12),
    prisma.recommendationPreference.findUnique({ where: { userId: user.id }, include: { interests: true } }),
  ]);
  const categoryLabel = recommendationCategories.find((item) => item.value === category)?.label ?? "kısa videolar";
  const interestLabels = preferences?.interests
    .flatMap(({ category: selected }) => {
      const label = recommendationCategories.find((item) => item.value === selected)?.label;
      return label ? [label] : [];
    });
  const videoSearchTerm = category ? categoryLabel : interestLabels?.join(" ") || "Türkiye kısa video";
  return (
    <main className="min-h-screen pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#eaf2e8] text-[#315b46] shadow-sm"><Compass size={22} /></span>
          <div><p className="eyebrow">Gültepe topluluğu</p><h1 className="text-2xl font-bold tracking-tight">Keşfet</h1><p className="text-sm text-[#68716b]">Yeni hesaplar, ilgi alanların ve açık kaynak videolar.</p></div>
        </div>
        <section className="suggestion-panel mt-6 rounded-2xl border border-[#e1e6df] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} /> Yeni insanları keşfet</h2><Link href="/people/suggested" className="text-xs font-semibold text-[#557260] hover:underline">Tümünü gör</Link></div>
          <div className="suggestion-rail mt-3 flex gap-3 overflow-x-auto pb-2">
            {people.map((person) => <article key={person.id} className="suggestion-card flex shrink-0 items-center gap-3 rounded-xl border border-[#edf0eb] p-3">
              <Link href={`/profile/${encodeURIComponent(person.username)}`}><UserAvatar {...person} className="size-11" /></Link>
              <div className="min-w-0 flex-1"><Link href={`/profile/${encodeURIComponent(person.username)}`} className="block truncate text-sm font-semibold hover:underline">{person.displayName ?? person.username}</Link><span className="block truncate text-xs text-[#788179]">@{person.username}</span><span className="text-[10px] text-[#788179]">{person._count.followers} takipçi</span></div>
              <FollowSuggestionButton username={person.username} />
              <DismissSuggestionButton userId={person.id} />
            </article>)}
            {people.length === 0 && <p className="text-sm text-[#788179]">Şimdilik yeni hesap önerisi yok.</p>}
          </div>
        </section>
        <nav aria-label="Keşfet kategorileri" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          <Link href="/explore" aria-current={!category ? "page" : undefined} className={`category-pill ${!category ? "category-pill-active" : ""}`}>Tümü</Link>
          {recommendationCategories.map((item) => <Link key={item.value} href={`/explore?category=${item.value}`} aria-current={category === item.value ? "page" : undefined} className={`category-pill ${category === item.value ? "category-pill-active" : ""}`}>{item.label}</Link>)}
        </nav>
        <ExternalVideoExplorer key={category ?? "all"} category={category ?? ""} searchTerm={videoSearchTerm} />
        <section className="mt-7">
          <h2 className="text-lg font-bold tracking-tight">Senin için</h2>
          {posts.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
              <header className="flex items-center gap-2 p-3">
                <UserAvatar {...post.user} className="size-9" />
                <Link href={`/profile/${encodeURIComponent(post.user.username)}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">@{post.user.username}</Link>
                <span className="text-[10px] text-[#788179]">{post.isReel ? "Reels" : "Gönderi"}</span>
              </header>
              <Link href={`/post/${post.id}`} className="block">
                {post.sharedPost && <p className="px-3 py-2 text-xs text-[#68716b]">Yeniden paylaşım · @{post.sharedPost.user.username}</p>}
                {post.mediaType === "PHOTO" && post.mediaUrl && <Image src={post.mediaUrl} alt={post.caption ?? "Keşfedilen gönderi"} width={720} height={900} unoptimized className="max-h-96 w-full bg-[#f0f2ef] object-contain" />}
                {post.mediaType === "VIDEO" && post.mediaUrl && <video src={post.mediaUrl} controls playsInline preload="metadata" className="max-h-96 w-full bg-black object-contain" />}
                {post.caption && <p className="line-clamp-4 whitespace-pre-wrap p-3 text-sm">{post.caption}</p>}
              </Link>
              <div className="flex flex-wrap gap-1 px-3 pb-2">{post.hashtags.map(({ hashtag }) => <Link key={hashtag.tagKey} href={`/search?q=${encodeURIComponent(`#${hashtag.name}`)}`} className="text-xs text-[#557260] hover:underline">#{hashtag.name}</Link>)}</div>
              <Link href={`/post/${post.id}`} className="block border-t border-[#edf0eb] px-3 py-2 text-xs text-[#68716b] hover:text-[#315b46]">
                {post.hideLikeCount && post.userId !== user.id ? "Beğeni sayısı gizli" : `${post._count.likes} beğeni`} · {post._count.comments} yorum · Aç
              </Link>
              <RecommendationFeedbackButtons postId={post.id} authorId={post.userId} category={post.category} />
            </article>)}
          </div> : <p className="mt-4 rounded-2xl border border-dashed border-[#d5ddd4] bg-white px-5 py-12 text-center text-sm text-[#788179]">Şu an önerilecek yeni içerik yok. Takip edip etkileşim kurdukça öneriler kişiselleşir.</p>}
        </section>
        {posts.length === 40 && page < 3 && <Link href={`/explore?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page + 1) })}`} className="mt-5 block rounded-xl border border-[#dce2dc] bg-white py-3 text-center text-sm font-semibold text-[#315b46] hover:bg-[#edf4e9]">Daha fazla öneri yükle</Link>}
      </section>
    </main>
  );
}
