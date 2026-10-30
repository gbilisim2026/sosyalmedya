import { prisma } from "@/lib/prisma";

export async function archiveExpiredStories(now = new Date()) {
  const [stories] = await prisma.$transaction([
    prisma.story.updateMany({
      where: { isArchived: false, expiresAt: { lte: now } },
      data: { isArchived: true },
    }),
    prisma.user.updateMany({
      where: { profileNote: { not: null }, profileNoteExpiresAt: { lte: now } },
      data: { profileNote: null, profileNoteExpiresAt: null },
    }),
  ]);
  return stories.count;
}
