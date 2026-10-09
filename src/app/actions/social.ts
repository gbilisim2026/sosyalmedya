"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MediaType, FollowRequestStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveUploadedMedia } from "@/lib/uploads";

export type SocialFormState = { error?: string };

function getHashtags(caption: string) {
  const tags = new Map<string, string>();
  for (const match of caption.matchAll(/#([\p{L}\p{N}_]{1,100})/gu)) {
    const name = match[1];
    const tagKey = name.toLocaleLowerCase("tr-TR");
    tags.set(tagKey, name);
  }
  return [...tags].map(([tagKey, name]) => ({ tagKey, name }));
}

export async function createPostAction(
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const caption = String(formData.get("caption") ?? "").trim();
  if (caption.length > 2200) return { error: "Açıklama en fazla 2200 karakter olabilir." };

  const selectedFile = formData.get("media");
  let mediaUrl: string | null = null;
  let mediaType: MediaType = MediaType.TEXT;

  if (selectedFile instanceof File && selectedFile.size > 0) {
    try {
      const saved = await saveUploadedMedia(selectedFile);
      mediaUrl = saved.mediaUrl;
      mediaType = saved.mediaType;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Dosya yüklenemedi." };
    }
  } else if (!caption) {
    return { error: "Bir metin yaz veya fotoğraf/video seç." };
  }

  const hashtags = getHashtags(caption);
  await prisma.$transaction(async (transaction) => {
    const post = await transaction.post.create({
      data: {
        userId: user.id,
        caption: caption || null,
        mediaUrl,
        mediaType,
        hashtags: {
          create: await Promise.all(
            hashtags.map(async ({ tagKey, name }) => ({
              hashtag: {
                connectOrCreate: {
                  where: { tagKey },
                  create: { tagKey, name },
                },
              },
            })),
          ),
        },
      },
    });
    return post;
  });

  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  redirect("/");
}

export async function createStoryAction(
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const selectedFile = formData.get("media");
  if (!(selectedFile instanceof File) || selectedFile.size === 0) {
    return { error: "Hikâyen için bir fotoğraf veya video seç." };
  }

  let saved: Awaited<ReturnType<typeof saveUploadedMedia>>;
  try {
    saved = await saveUploadedMedia(selectedFile);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dosya yüklenemedi." };
  }

  await prisma.story.create({
    data: {
      userId: user.id,
      mediaUrl: saved.mediaUrl,
      mediaType: saved.mediaType,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  redirect("/");
}

export async function followUserAction(username: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true, isPrivate: true },
  });
  if (!target || target.id === user.id) return;

  if (target.isPrivate) {
    await prisma.followRequest.upsert({
      where: { requesterId_targetId: { requesterId: user.id, targetId: target.id } },
      create: { requesterId: user.id, targetId: target.id },
      update: { status: FollowRequestStatus.PENDING },
    });
  } else {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
      create: { followerId: user.id, followingId: target.id },
      update: {},
    });
  }

  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/");
}

export async function unfollowUserAction(username: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!target || target.id === user.id) return;

  await prisma.follow.deleteMany({ where: { followerId: user.id, followingId: target.id } });
  await prisma.followRequest.deleteMany({ where: { requesterId: user.id, targetId: target.id } });
  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/");
}

export async function acceptFollowRequestAction(requestId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const request = await prisma.followRequest.findFirst({
    where: { id: requestId, targetId: user.id, status: FollowRequestStatus.PENDING },
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: request.requesterId,
          followingId: user.id,
        },
      },
      create: { followerId: request.requesterId, followingId: user.id },
      update: {},
    }),
    prisma.followRequest.update({
      where: { id: request.id },
      data: { status: FollowRequestStatus.ACCEPTED },
    }),
  ]);

  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/");
}