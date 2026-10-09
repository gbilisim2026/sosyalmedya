import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const instant = false;

type AccountListPageProps = {
  params: Promise<{ username: string; list: string }>;
};

export default async function AccountListPage({ params }: AccountListPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { username, list } = await params;
  if (list !== "followers" && list !== "following") notFound();

  const profile = await prisma.user.findUnique({
    where: { usernameKey: decodeURIComponent(username).toLowerCase() },
    select: { id: true, username: true, displayName: true, isPrivate: true },
  });
  if (!profile) notFound();

  const isOwnProfile = profile.id === currentUser.id;
  const isFollowing = isOwnProfile || !profile.isPrivate || Boolean(await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUser.id, followingId: profile.id } },
    select: { id: true },
  }));
  if (!isFollowing) {
    return (
      <main className="min-h-screen bg-[#f4f6f2] text-[#202522]">
        <SiteHeader username={currentUser.username} />
        <p className="mx-auto mt-16 max-w-lg rounded-xl border border-[#e1e6df] bg-white p-8 text-center text-sm text-[#68716b]">
          Bu hesabın takipçi listesi yalnızca onaylı takipçilerine görünür.
        </p>
      </main>
    );
  }

  const people = list === "followers"
    ? await prisma.follow.findMany({
        where: { followingId: profile.id },
        include: { follower: { select: { username: true, displayName: true, bio: true } } },
        orderBy: { createdAt: "desc" },
      }).then((entries) => entries.map((entry) => entry.follower))
    : await prisma.follow.findMany({
        where: { followerId: profile.id },
        include: { following: { select: { username: true, displayName: true, bio: true } } },
        orderBy: { createdAt: "desc" },
      }).then((entries) => entries.map((entry) => entry.following));

  const title = list === "followers" ? "Takipçiler" : "Takip edilenler";

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href={`/profile/${encodeURIComponent(profile.username)}`} className="text-sm text-[#557260] hover:underline">← @{profile.username}</Link>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <div className="mt-5 divide-y divide-[#edf0eb] rounded-2xl border border-[#e1e6df] bg-white px-5">
          {people.length ? people.map((person) => <Link key={person.username} href={`/profile/${encodeURIComponent(person.username)}`} className="flex items-center gap-3 py-4 hover:text-[#315b46]">
            <span className="grid size-11 place-items-center rounded-full bg-[#e9efe7] font-semibold text-[#315b46]">{(person.displayName ?? person.username).slice(0, 1).toUpperCase()}</span>
            <span><span className="block text-sm font-semibold">{person.displayName ?? person.username}</span><span className="text-xs text-[#788179]">@{person.username}</span></span>
            {person.bio && <span className="ml-auto hidden max-w-[45%] truncate text-xs text-[#788179] sm:block">{person.bio}</span>}
          </Link>) : <p className="py-10 text-center text-sm text-[#788179]">Henüz kullanıcı yok.</p>}
        </div>
      </section>
    </main>
  );
}