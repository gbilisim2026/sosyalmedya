import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { visualEffectClass } from "@/lib/effects";

export const instant = false;

type StoryPageProps = { params: Promise<{ id: string }> };

export default async function StoryPage({ params }: StoryPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const story = await prisma.story.findFirst({
    where: {
      id,
      expiresAt: { gt: new Date() },
      OR: [
        { userId: currentUser.id },
        { user: { isPrivate: false } },
        { user: { followers: { some: { followerId: currentUser.id } } } },
      ],
    },
    include: { user: { select: { id: true, username: true, displayName: true } } },
  });
  if (!story) notFound();

  if (story.userId !== currentUser.id) {
    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: story.id, viewerId: currentUser.id } },
      create: { storyId: story.id, viewerId: currentUser.id },
      update: {},
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={currentUser.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/profile/${encodeURIComponent(story.user.username)}`} className="text-sm font-semibold hover:underline">{story.user.displayName ?? story.user.username} · @{story.user.username}</Link>
          <span className="text-xs text-[#788179]">{story.expiresAt.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" })}’de sona erer</span>
        </div>
        <div className="mx-auto flex min-h-[55vh] max-h-[78vh] items-center justify-center overflow-hidden rounded-2xl bg-[#18231d]">
          {story.mediaType === "VIDEO" ? <video src={story.mediaUrl} controls autoPlay playsInline className={`max-h-[78vh] w-full object-contain ${visualEffectClass(story.visualEffect)}`} /> : <Image src={story.mediaUrl} width={1080} height={1920} alt={`${story.user.username} hikâyesi`} className={`max-h-[78vh] w-full object-contain ${visualEffectClass(story.visualEffect)}`} />}
        </div>
        <Link href="/" className="mt-5 inline-block text-sm text-[#557260] hover:underline">← Akışa dön</Link>
      </section>
    </main>
  );
}