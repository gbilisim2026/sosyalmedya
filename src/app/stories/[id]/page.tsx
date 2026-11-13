import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visualEffectClass } from "@/lib/effects";
import { visibleStoriesWhere } from "@/lib/visibility";
import { deleteStoryAction, reshareStoryAction, updateContentAudienceAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";
import { StoryMusicPlayer } from "@/app/stories/story-music-player";
import { StoryMusicEditor } from "@/app/stories/story-music-editor";
import { StoryReply } from "@/app/stories/story-reply";
import { StoryPlayback } from "@/app/stories/story-playback";

export const instant = false;

type StoryPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function StoryPage({ params, searchParams }: StoryPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const story = await prisma.story.findFirst({
    where: {
      id,
      OR: [{ userId: currentUser.id }, { expiresAt: { gt: new Date() } }],
      AND: [visibleStoriesWhere(currentUser.id)],
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      sharedStory: { include: { user: { select: { username: true } } } },
    },
  });
  if (!story) notFound();

  if (story.userId !== currentUser.id) {
    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: story.id, viewerId: currentUser.id } },
      create: { storyId: story.id, viewerId: currentUser.id },
      update: { viewCount: { increment: 1 }, hiddenFromHistory: false },
    });
  }
  const [totalViews, viewers] = story.userId === currentUser.id
    ? await Promise.all([
        prisma.storyView.aggregate({ where: { storyId: story.id }, _sum: { viewCount: true } }),
        prisma.storyView.findMany({
          where: { storyId: story.id },
          include: { viewer: { select: { username: true, displayName: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [null, []];
  const selectedAudience = story.userId === currentUser.id
    ? await prisma.storyAudience.findMany({
        where: { storyId: story.id },
        include: { user: { select: { username: true } } },
      })
    : [];
  const activeStories = await prisma.story.findMany({
    where: { expiresAt: { gt: new Date() }, isArchived: false, AND: [visibleStoriesWhere(currentUser.id)] },
    select: { id: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const activeStoryIndex = activeStories.findIndex(({ id: activeId }) => activeId === story.id);
  const previousStory = activeStoryIndex > 0 ? activeStories[activeStoryIndex - 1] : null;
  const nextStory = activeStoryIndex >= 0 ? activeStories[activeStoryIndex + 1] : null;

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/profile/${encodeURIComponent(story.user.username)}`} className="flex items-center gap-2 text-sm font-semibold hover:underline"><UserAvatar {...story.user} className="size-9" />{story.user.displayName ?? story.user.username} · @{story.user.username}</Link>
          <span className="text-xs text-[#788179]">{story.expiresAt > new Date() ? `${story.expiresAt.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" })}’de sona erer` : "Hikâye arşivde"}</span>
        </div>
        {query.error === "audience" && <p role="alert" className="mb-3 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Hedef kitle geçersiz veya seçilen kullanıcılardan biri bulunamadı.</p>}
        {query.error === "music" && <p role="alert" className="mb-3 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Müzik seçimi geçersiz. Lütfen Apple kataloğundan yeniden seç.</p>}
        {story.userId === currentUser.id && story.expiresAt > new Date() && <StoryMusicEditor
          storyId={story.id}
          initialTrack={story.musicTrackId && story.musicTitle && story.musicArtist && story.musicArtworkUrl && story.musicPreviewUrl && story.musicTrackUrl ? {
            trackId: story.musicTrackId,
            title: story.musicTitle,
            artist: story.musicArtist,
            artworkUrl: story.musicArtworkUrl,
            previewUrl: story.musicPreviewUrl,
            trackUrl: story.musicTrackUrl,
            startSeconds: story.musicStartSeconds ?? 0,
            durationSeconds: story.musicDurationSeconds ?? 15,
            labelStyle: story.musicLabelStyle === "cover" ? "cover" : "compact",
            labelPosition: story.musicLabelPosition === "top" ? "top" : "bottom",
            labelScale: story.musicLabelScale ?? 1,
          } : null}
        />}
        {story.userId === currentUser.id && <section className="mb-4 rounded-xl border border-[#e1e6df] bg-white p-4">
          <h2 className="text-sm font-semibold">Görüntülenme: {totalViews?._sum.viewCount ?? 0} · Benzersiz izleyici: {viewers.length}</h2>
          <div className="mt-2 flex flex-wrap gap-2">{viewers.map(({ viewer }) =>
            <Link key={viewer.username} href={`/profile/${encodeURIComponent(viewer.username)}`} className="rounded-full bg-[#edf4e9] px-3 py-1 text-xs font-medium">@{viewer.username}</Link>
          )}</div>
        </section>}
        {story.userId === currentUser.id && story.expiresAt > new Date() && <form action={updateContentAudienceAction.bind(null, "story", story.id)} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#e1e6df] bg-white p-4">
          <label className="text-xs font-semibold">Hikâye hedef kitlesi
            <select name="audience" defaultValue={story.audience} className="mt-1 block h-10 rounded-lg border border-[#dce2dc] bg-white px-2">
              <option value="EVERYONE">Herkes</option><option value="FOLLOWERS">Takipçiler</option><option value="CLOSE_FRIENDS">Yakın arkadaşlar</option><option value="SELECTED">Belirli kişiler</option>
            </select>
          </label>
          <label className="min-w-52 flex-1 text-xs font-semibold">Belirli kullanıcı adları
            <input name="selectedUsernames" defaultValue={selectedAudience.map(({ user }) => user.username).join(", ")} className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] px-2 font-normal" placeholder="@kullanici1, kullanici2" />
          </label>
          <button className="h-10 rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white">Gizliliği güncelle</button>
        </form>}
        <StoryPlayback
          active={story.expiresAt > new Date()}
          isVideo={story.mediaType === "VIDEO"}
          previousHref={previousStory ? `/stories/${previousStory.id}` : null}
          nextHref={nextStory ? `/stories/${nextStory.id}` : "/"}
        >
          <div className="relative mx-auto flex min-h-[55vh] max-h-[78vh] items-center justify-center overflow-hidden rounded-2xl bg-[#18231d]">
            {story.mediaType === "VIDEO" ? <video src={story.mediaUrl} controls autoPlay playsInline className={`max-h-[78vh] w-full object-contain ${visualEffectClass(story.visualEffect)}`} /> : <Image src={story.mediaUrl} width={1080} height={1920} alt={`${story.user.username} hikâyesi`} unoptimized className={`max-h-[78vh] w-full object-contain ${visualEffectClass(story.visualEffect)}`} />}
            {story.musicTitle && story.musicArtist && story.musicPreviewUrl && story.musicArtworkUrl && story.musicTrackUrl && <StoryMusicPlayer
              title={story.musicTitle}
              artist={story.musicArtist}
              artworkUrl={story.musicArtworkUrl}
              trackUrl={story.musicTrackUrl}
              previewUrl={story.musicPreviewUrl}
              startSeconds={story.musicStartSeconds ?? 0}
              durationSeconds={story.musicDurationSeconds ?? 15}
              labelStyle={story.musicLabelStyle}
              labelPosition={story.musicLabelPosition}
              labelScale={story.musicLabelScale}
            />}
            {story.caption && <p className="absolute bottom-8 left-4 right-4 mx-auto max-w-lg whitespace-pre-wrap rounded-xl bg-black/50 px-4 py-3 text-center text-base text-white">{story.caption}</p>}
          </div>
        </StoryPlayback>
        {story.sharedStory && <p className="mt-2 text-xs text-[#68716b]">Orijinal hikâye: <Link href={`/profile/${encodeURIComponent(story.sharedStory.user.username)}`} className="font-semibold hover:underline">@{story.sharedStory.user.username}</Link></p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          {previousStory ? <Link href={`/stories/${previousStory.id}`} className="text-sm font-semibold text-[#557260] hover:underline">← Önceki</Link> : <span />}
          {nextStory ? <Link href={`/stories/${nextStory.id}`} className="text-sm font-semibold text-[#557260] hover:underline">Sonraki →</Link> : <Link href="/" className="text-sm text-[#557260] hover:underline">Akışa dön →</Link>}
        </div>
        {story.userId !== currentUser.id && story.expiresAt > new Date() && <StoryReply storyId={story.id} />}
        {story.userId === currentUser.id && <div className="mt-4 flex justify-between gap-3">
          <Link href="/stories/archive" className="text-sm font-semibold text-[#557260] hover:underline">Hikâye arşivim</Link>
          <form action={deleteStoryAction.bind(null, story.id)}>
            <button className="text-sm font-semibold text-[#a53f30] hover:underline">Hikâyeyi sil</button>
          </form>
        </div>}
        {story.userId !== currentUser.id && story.allowReshare && story.audience === "EVERYONE" && <form action={reshareStoryAction.bind(null, story.id)} className="mt-4">
          <button className="rounded-lg border border-[#dce2dc] bg-white px-4 py-2 text-sm font-semibold">Hikâyeyi yeniden paylaş</button>
        </form>}
      </section>
    </main>
  );
}