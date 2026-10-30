import { open } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { usersCanMessageWhere, visiblePostsWhere, visibleStoriesWhere } from "@/lib/visibility";

const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { filename } = await params;
  const extension = path.extname(filename).slice(1).toLowerCase();
  if (
    path.basename(filename) !== filename ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(filename)
  ) {
    notFound();
  }

  const mediaUrl = `/media/${filename}`;
  const [visiblePost, visibleStory, visibleMessage, visibleAvatar] = await Promise.all([
    prisma.post.findFirst({
      where: {
        mediaUrl,
        OR: [
          { userId: user.id, sharedPostId: null },
          { AND: [visiblePostsWhere(user.id)] },
        ],
      },
      select: { id: true },
    }),
    prisma.story.findFirst({
      where: {
        mediaUrl,
        OR: [{ userId: user.id }, { expiresAt: { gt: new Date() } }],
        AND: [visibleStoriesWhere(user.id)],
      },
      select: { id: true },
    }),
    prisma.directMessage.findFirst({
      where: {
        mediaUrl,
        mediaType: "PHOTO",
        conversation: {
          OR: [
            {
              participantOneId: user.id,
              participantTwo: { AND: [usersCanMessageWhere(user.id)] },
            },
            {
              participantTwoId: user.id,
              participantOne: { AND: [usersCanMessageWhere(user.id)] },
            },
          ],
        },
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        avatarUrl: mediaUrl,
        NOT: [
          { blocksCreated: { some: { blockedId: user.id } } },
          { blocksReceived: { some: { blockerId: user.id } } },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!visiblePost && !visibleStory && !visibleMessage && !visibleAvatar) notFound();

  const filePath = path.join(process.cwd(), "private-uploads", filename);
  let file;
  try {
    file = await open(filePath, "r");
  } catch (error) {
    if (isMissingFile(error)) notFound();
    throw error;
  }

  try {
    const { size } = await file.stat();
    const range = request.headers.get("range");
    let start = 0;
    let end = size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Cache-Control": "private, no-store" },
        });
      }
      if (!match[1]) {
        const suffixLength = Number(match[2]);
        start = Math.max(0, size - suffixLength);
      } else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), size - 1);
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Cache-Control": "private, no-store" },
        });
      }
    }

    const content = Buffer.alloc(end - start + 1);
    await file.read(content, 0, content.byteLength, start);
    return new Response(new Uint8Array(content), {
      status: range ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Length": String(content.byteLength),
        "Content-Type": mediaTypes[extension],
        "X-Content-Type-Options": "nosniff",
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
      },
    });
  } finally {
    await file.close();
  }
}
