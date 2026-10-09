import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { acceptFollowRequestAction, followUserAction, unfollowUserAction } from "@/app/actions/social";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
      coverUrl: true,
      isPrivate: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!profile) notFound();

  const isOwnProfile = profile.id === currentUser.id;
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

  const canViewContent = isOwnProfile || !profile.isPrivate || Boolean(follow);
  const [posts, stories] = canViewContent
    ? await Promise.all([
        prisma.post.findMany({
          where: { userId: profile.id },
          include: { _count: { select: { likes: true, comments: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.story.findMany({
          where: { userId: profile.id, expiresAt: { gt: new Date() } },
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
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              <span className="grid size-20 place-items-center rounded-full border-4 border-white bg-[#dce9d7] text-2xl font-semibold text-[#315b46]">
                {profile.displayName?.slice(0, 1).toUpperCase() ?? profile.username.slice(0, 1).toUpperCase()}
              </span>
              {!isOwnProfile && (
                follow ? (
                  <form action={unfollowUserAction.bind(null, profile.username)}>
                    <button className="h-10 rounded-lg border border-[#dce2dc] px-4 text-sm font-semibold hover:bg-[#f4f6f2]">Takibi bırak</button>
                  </form>
                ) : request?.status === "PENDING" ? (
                  <button disabled className="h-10 rounded-lg bg-[#edf4e9] px-4 text-sm font-semibold text-[#557260]">İstek gönderildi</button>
                ) : (
                  <form action={followUserAction.bind(null, profile.username)}>
                    <button className="h-10 rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white hover:bg-[#2c5145]">
                      {profile.isPrivate ? "Takip isteği gönder" : "Takip et"}
                    </button>
                  </form>
                )
              )}
            </div>
            <h1 className="mt-4 text-xl font-semibold">{profile.displayName ?? profile.username}</h1>
            <p className="text-sm text-[#68716b]">@{profile.username}{profile.isPrivate ? " · Özel hesap" : ""}</p>
            {profile.bio && <p className="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>}
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm">
              <span><b>{profile._count.posts}</b> gönderi</span>
              <span><b>{profile._count.followers}</b> takipçi</span>
              <span><b>{profile._count.following}</b> takip edilen</span>
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
            <h2 className="font-semibold">Bu hesap gizli</h2>
            <p className="mt-2 text-sm text-[#68716b]">Gönderileri ve hikâyeleri görmek için takip isteği gönder.</p>
          </div>
        ) : (
          <>
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
                  {posts.map((post) => <article key={post.id} className="flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#e1e6df] bg-white">
                    {post.mediaType === "PHOTO" && post.mediaUrl ? <div className="relative min-h-0 flex-1"><Image src={post.mediaUrl} alt={post.caption ?? "Gönderi"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" /></div> : post.mediaType === "VIDEO" && post.mediaUrl ? <video src={post.mediaUrl} controls className="h-full min-h-0 w-full bg-black object-contain" /> : <p className="line-clamp-6 whitespace-pre-wrap p-3 text-sm leading-6">{post.caption}</p>}
                    <div className="shrink-0 border-t border-[#edf0eb] px-3 py-2 text-xs text-[#68716b]">{post._count.likes} beğeni · {post._count.comments} yorum</div>
                  </article>)}
                </div>}
            </section>
          </>
        )}
        {isOwnProfile && <Link href="/create" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Yeni gönderi</Link>}
      </section>
    </main>
  );
}