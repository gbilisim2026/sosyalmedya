import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { acceptFollowRequestAction, followUserAction, unfollowUserAction, withdrawFollowRequestAction, saveProfileNameAction, saveProfileNoteAction } from "@/app/actions/social";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visualEffectClass } from "@/lib/effects";
import { visiblePostsWhere, visibleStoriesWhere } from "@/lib/visibility";
import { PostControls } from "@/app/post-controls";
import { startConversationAction } from "@/app/actions/social";
import { Globe2, Images, LockKeyhole, Pin, Star } from "lucide-react";
import { UserAvatar } from "@/app/user-avatar";
import { AvatarEditor } from "@/app/profile/[username]/avatar-editor";
import { BlockToggle } from "@/app/profile/[username]/profile-actions";
import { ProfileMusic } from "@/app/profile/[username]/profile-music";
import { getSuggestedPeople } from "@/lib/recommendations";
import { FollowSuggestionButton } from "@/app/profile/[username]/profile-actions";
import { DismissSuggestionButton } from "@/app/recommendation-controls";

export const instant = false;

type ProfilePageProps = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: ProfilePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { username } = await params;
  const profile = await prisma.user.findUnique({
    where: { usernameKey: decodeURIComponent(username).toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      avatarScale: true,
      avatarOffsetX: true,
      avatarOffsetY: true,
      profileNote: true,
      profileNoteAudience: true,
      profileNoteExpiresAt: true,
      profileMusicTrackId: true,
      profileMusicTitle: true,
      profileMusicArtist: true,
      profileMusicArtworkUrl: true,
      profileMusicPreviewUrl: true,
      profileMusicTrackUrl: true,
      coverUrl: true,
      isPrivate: true,
      _count: { select: { posts: { where: { isArchived: false } }, followers: true, following: true } },
    },
  });
  if (!profile) notFound();

  const isOwnProfile = profile.id === currentUser.id;
  const blockState = isOwnProfile ? null : await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: profile.id, blockedId: currentUser.id },
        { blockerId: currentUser.id, blockedId: profile.id },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blockedByCurrentUser = blockState?.blockerId === currentUser.id;
  const blockedCurrentUser = blockState?.blockedId === currentUser.id;
  if (blockedCurrentUser) notFound();
  const [follow, request, pendingRequests] = await Promise.all([
    isOwnProfile
      ? null
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUser.id, followingId: profile.id } },
        }),
    isOwnProfile
      ? null
      : prisma.followRequest.findUnique({
          where: { requesterId_targetId: { requesterId: currentUser.id, targetId: profile.id } },
        }),
    isOwnProfile
      ? prisma.followRequest.findMany({
          where: { targetId: currentUser.id, status: "PENDING" },
          include: { requester: { select: { username: true, displayName: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const canViewContent = isOwnProfile || (!blockedByCurrentUser && (!profile.isPrivate || Boolean(follow)));
  const suggestedPeople = !isOwnProfile && !blockedByCurrentUser
    ? await getSuggestedPeople(currentUser.id, profile.id, 4)
    : [];
  const noteAudienceAllowed = isOwnProfile ||
    (profile.profileNoteAudience === "EVERYONE" && !blockedByCurrentUser) ||
    (profile.profileNoteAudience === "FOLLOWERS" && Boolean(follow) && !blockedByCurrentUser) ||
    (profile.profileNoteAudience === "CLOSE_FRIENDS" && !blockedByCurrentUser && Boolean(await prisma.closeFriend.findUnique({
      where: { ownerId_friendId: { ownerId: profile.id, friendId: currentUser.id } },
      select: { id: true },
    })));
  const noteIsActive = Boolean(profile.profileNote && profile.profileNoteExpiresAt && profile.profileNoteExpiresAt > new Date() && noteAudienceAllowed);
  if (profile.profileNote && profile.profileNoteExpiresAt && profile.profileNoteExpiresAt <= new Date()) {
    await prisma.user.updateMany({
      where: { id: profile.id, profileNoteExpiresAt: { lte: new Date() } },
      data: { profileNote: null, profileNoteExpiresAt: null },
    });
  }
  const [posts, stories] = canViewContent
    ? await Promise.all([
        prisma.post.findMany({
          where: { userId: profile.id, AND: [visiblePostsWhere(currentUser.id)] },
          include: {
            _count: { select: { likes: true, comments: true } },
            mediaItems: { orderBy: { position: "asc" } },
            sharedPost: { include: { user: { select: { username: true } } } },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        }),
        prisma.story.findMany({
          where: { userId: profile.id, isArchived: false, expiresAt: { gt: new Date() }, AND: [visibleStoriesWhere(currentUser.id)] },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white">
          <div className="h-36 bg-[#203d34] sm:h-48" style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
          <div className="px-5 pb-6 sm:px-8">
            <div className="relative -mt-10 flex flex-wrap items-end justify-between gap-4">
              <UserAvatar
                username={profile.username}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                scale={profile.avatarScale}
                offsetX={profile.avatarOffsetX}
                offsetY={profile.avatarOffsetY}
                className="size-20 border-4 border-white text-2xl"
              />
              {noteIsActive && <span className="absolute left-16 top-[-1.25rem] z-10 max-w-48 rounded-2xl border border-[#dce2dc] bg-white px-3 py-2 text-xs shadow-lg">{profile.profileNote}</span>}
              {!isOwnProfile && (
                <div className="flex items-center gap-2">
                  {!blockedByCurrentUser && <form action={startConversationAction.bind(null, profile.username)}>
                    <button className="h-10 rounded-lg border border-[#dce2dc] px-4 text-sm font-semibold hover:bg-[#f4f6f2]">Mesaj</button>
                  </form>}
                  <BlockToggle username={profile.username} blockedByCurrentUser={Boolean(blockedByCurrentUser)} />
                  {!blockedByCurrentUser && (follow ? (
                    <form action={unfollowUserAction.bind(null, profile.username)}>
                      <button className="h-10 rounded-lg border border-[#dce2dc] px-4 text-sm font-semibold hover:bg-[#f4f6f2]">Takibi bırak</button>
                    </form>
                  ) : request?.status === "PENDING" ? (
                    <form action={withdrawFollowRequestAction.bind(null, profile.username)}>
                      <button className="h-10 rounded-lg bg-[#edf4e9] px-4 text-sm font-semibold text-[#557260]">İsteği geri çek</button>
                    </form>
                  ) : (
                    <form action={followUserAction.bind(null, profile.username)}>
                      <button className="h-10 rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white hover:bg-[#2c5145]">
                        {profile.isPrivate ? "Takip isteği gönder" : "Takip et"}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
            <h1 className="mt-4 text-xl font-semibold">{profile.displayName ?? profile.username}</h1>
            <p className="flex items-center gap-1.5 text-sm text-[#68716b]">
              @{profile.username}
              {profile.isPrivate ? <><LockKeyhole size={14} /> Gizli hesap</> : <><Globe2 size={14} /> Herkese açık</>}
            </p>
            {profile.bio && <p className="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>}
            {isOwnProfile && <form action={saveProfileNameAction} className="mt-4 flex max-w-xl flex-wrap items-end gap-2 rounded-xl border border-[#e1e6df] bg-[#f8faf7] p-3">
              <label className="min-w-52 flex-1 text-xs font-semibold">Ad soyad
                <input name="displayName" maxLength={60} defaultValue={profile.displayName ?? ""} placeholder="Adınız Soyadınız" className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] bg-white px-3 text-sm font-normal" />
              </label>
              <button className="h-10 rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white">Profili güncelle</button>
            </form>}
            {canViewContent && <ProfileMusic
              title={profile.profileMusicTitle}
              artist={profile.profileMusicArtist}
              artworkUrl={profile.profileMusicArtworkUrl}
              previewUrl={profile.profileMusicPreviewUrl}
              trackUrl={profile.profileMusicTrackUrl}
              isOwner={isOwnProfile}
            />}
            {isOwnProfile && <form action={saveProfileNoteAction} className="mt-4 grid max-w-xl gap-3 rounded-xl border border-[#e1e6df] bg-[#f8faf7] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="text-xs font-semibold">Profil notu (180 karakter)
                <input name="note" maxLength={180} defaultValue={noteIsActive ? profile.profileNote ?? "" : ""} placeholder="Kısa bir not ve emoji..." className="mt-1 block h-10 w-full rounded-lg border border-[#dce2dc] bg-white px-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold">Kimler görebilir?
                <select name="audience" defaultValue={profile.profileNoteAudience} className="mt-1 block h-10 rounded-lg border border-[#dce2dc] bg-white px-2 text-sm font-normal">
                  <option value="EVERYONE">Herkes</option><option value="FOLLOWERS">Takipçiler</option><option value="CLOSE_FRIENDS">Yakın arkadaşlar</option>
                </select>
              </label>
              <label className="text-xs font-semibold">Süre
                <select name="duration" defaultValue="24" className="mt-1 block h-10 rounded-lg border border-[#dce2dc] bg-white px-2 text-sm font-normal">
                  <option value="1">1 saat</option><option value="6">6 saat</option><option value="12">12 saat</option><option value="24">24 saat</option>
                </select>
              </label>
              <button className="h-10 rounded-lg bg-[#203d34] px-3 text-xs font-semibold text-white sm:col-span-3">Notu kaydet</button>
            </form>}
            {isOwnProfile && <AvatarEditor
              avatarUrl={profile.avatarUrl}
              scale={profile.avatarScale}
              offsetX={profile.avatarOffsetX}
              offsetY={profile.avatarOffsetY}
            />}
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm">
              <span><b>{profile._count.posts}</b> gönderi</span>
              <Link href={`/profile/${encodeURIComponent(profile.username)}/followers`} className="hover:text-[#315b46] hover:underline"><b>{profile._count.followers}</b> takipçi</Link>
              <Link href={`/profile/${encodeURIComponent(profile.username)}/following`} className="hover:text-[#315b46] hover:underline"><b>{profile._count.following}</b> takip edilen</Link>
            </div>
          </div>
        </div>

        {isOwnProfile && pendingRequests.length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5">
            <h2 className="font-semibold">Takip istekleri</h2>
            <div className="mt-3 divide-y divide-[#edf0eb]">
              {pendingRequests.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/profile/${encodeURIComponent(item.requester.username)}`} className="text-sm font-medium hover:underline">@{item.requester.username}</Link>
                <form action={acceptFollowRequestAction.bind(null, item.id)}>
                  <button className="rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white">Kabul et</button>
                </form>
              </div>)}
            </div>
          </section>
        )}

        {!canViewContent ? (
          <div className="mt-6 rounded-2xl border border-[#e1e6df] bg-white px-6 py-12 text-center">
            <h2 className="font-semibold">{blockedByCurrentUser ? "Bu hesabı engelledin" : "Bu hesap gizli"}</h2>
            <p className="mt-2 text-sm text-[#68716b]">{blockedByCurrentUser ? "İçeriklerini tekrar görmek için engeli kaldır." : "Gönderileri ve hikâyeleri görmek için takip isteği gönder."}</p>
          </div>
        ) : (
          <>
            {isOwnProfile && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/settings" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Hesap ayarları</Link>
                <Link href="/saved" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Kaydedilenler</Link>
                <Link href="/archive" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Arşiv</Link>
                <Link href="/stories/archive" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Hikâye Arşivi</Link>
              </div>
            )}
            {isOwnProfile && posts.some((post) => post.isFeatured) && <section className="mt-7 rounded-2xl border border-[#e1e6df] bg-white p-4">
              <h2 className="text-sm font-semibold">Öne çıkanlar</h2>
              <div className="mt-2 flex flex-wrap gap-2">{posts.filter((post) => post.isFeatured).map((post) =>
                <Link key={post.id} href={`/post/${post.id}`} className="rounded-lg bg-[#edf4e9] px-3 py-2 text-xs font-medium">Gönderi · {post.createdAt.toLocaleDateString("tr-TR")}</Link>
              )}</div>
            </section>}
            {stories.length > 0 && <section className="mt-7">
              <h2 className="text-sm font-semibold">Aktif hikâyeler</h2>
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {stories.map((story) => <Link key={story.id} href={`/stories/${story.id}`} className="rounded-full border-2 border-[#e36650] px-4 py-2 text-sm font-medium">Hikâye · {story.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</Link>)}
              </div>
            </section>}
            <section className="mt-8">
              <h2 className="border-b border-[#dce2dc] pb-3 text-sm font-semibold uppercase tracking-wide">Gönderiler</h2>
              {posts.length === 0 ? <p className="py-12 text-center text-sm text-[#788179]">Henüz gönderi yok.</p> :
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                  {posts.map((post) => <article key={post.id} className="relative flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#e1e6df] bg-white">
                    {post.mediaItems.length > 1 && <span className="absolute right-2 top-2 z-10 rounded-lg bg-black/60 p-1.5 text-white" aria-label="Çoklu fotoğraf gönderisi"><Images size={15} /></span>}
                    {(post.isPinned || post.isFeatured) && <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold shadow">
                      {post.isPinned && <><Pin size={11} /> Sabit</>}
                      {post.isFeatured && <><Star size={11} /> Öne çıkan</>}
                    </span>}
                    {post.sharedPost ? <div className="flex min-h-0 flex-1 flex-col justify-center p-4">
                      <p className="text-xs font-semibold text-[#68716b]">Yeniden paylaşım · @{post.sharedPost.user.username}</p>
                      <Link href={`/post/${post.sharedPost.id}`} className="mt-2 text-sm font-medium text-[#315b46] hover:underline">Orijinal gönderiye git →</Link>
                    </div> : post.mediaType === "PHOTO" && post.mediaUrl ? <div className={`relative min-h-0 flex-1 ${visualEffectClass(post.visualEffect)}`}><Image src={post.mediaUrl} alt={post.caption ?? "Gönderi"} fill sizes="(max-width: 640px) 50vw, 33vw" unoptimized className="object-cover" /></div> : post.mediaType === "VIDEO" && post.mediaUrl ? <video src={post.mediaUrl} controls className={`h-full min-h-0 w-full bg-black object-contain ${visualEffectClass(post.visualEffect)}`} /> : <p className={`line-clamp-6 whitespace-pre-wrap p-3 text-sm leading-6 ${visualEffectClass(post.visualEffect)}`}>{post.caption}</p>}
                    <Link href={`/post/${post.id}`} className="shrink-0 border-t border-[#edf0eb] px-3 py-2 text-xs text-[#68716b] hover:text-[#315b46]">{(!post.hideLikeCount || isOwnProfile) && `${post._count.likes} beğeni · `}{post._count.comments} yorum · Ayrıntı</Link>
                    {isOwnProfile && <PostControls postId={post.id} isOwner isPinned={post.isPinned} isFeatured={post.isFeatured} isReshareAllowed={post.allowReshare} hideLikeCount={post.hideLikeCount} />}
                  </article>)}
                </div>}
            </section>
          </>
        )}
        {!isOwnProfile && !blockedByCurrentUser && suggestedPeople.length > 0 && <section className="mt-7 rounded-2xl border border-[#e1e6df] bg-white p-5">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Yeni insanları keşfet</h2><Link href="/people/suggested" className="text-xs font-semibold text-[#557260] hover:underline">Tümünü gör</Link></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {suggestedPeople.map((person) => <article key={person.id} className="flex items-center gap-3 rounded-xl border border-[#edf0eb] p-3">
              <Link href={`/profile/${encodeURIComponent(person.username)}`}><UserAvatar {...person} className="size-10" /></Link>
              <div className="min-w-0 flex-1"><Link href={`/profile/${encodeURIComponent(person.username)}`} className="block truncate text-sm font-semibold hover:underline">{person.displayName ?? person.username}</Link><span className="text-xs text-[#788179]">@{person.username}</span></div>
              <FollowSuggestionButton username={person.username} />
              <DismissSuggestionButton userId={person.id} />
            </article>)}
          </div>
        </section>}
        {isOwnProfile && <Link href="/create" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Yeni gönderi</Link>}
      </section>
    </main>
  );
}