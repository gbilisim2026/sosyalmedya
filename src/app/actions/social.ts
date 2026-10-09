"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FollowRequestStatus, MediaType, NotificationType, PostVisibility, VisualEffect } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveUploadedMedia } from "@/lib/uploads";
import { visiblePostsWhere } from "@/lib/visibility";

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
  const visibilityValue = String(formData.get("visibility") ?? PostVisibility.PUBLIC);
  const effectValue = String(formData.get("visualEffect") ?? VisualEffect.NONE);
  if (!Object.values(PostVisibility).includes(visibilityValue as PostVisibility)) {
    return { error: "Gönderi görünürlüğü geçersiz." };
  }
  if (!Object.values(VisualEffect).includes(effectValue as VisualEffect)) {
    return { error: "Görsel efekti geçersiz." };
  }
  const isReel = formData.get("isReel") === "on";

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
  if (isReel && mediaType !== MediaType.VIDEO) {
    return { error: "Reels olarak paylaşmak için video seçmelisin." };
  }

  const hashtags = getHashtags(caption);
  await prisma.$transaction(async (transaction) => {
    const post = await transaction.post.create({
      data: {
        userId: user.id,
        caption: caption || null,
        mediaUrl,
        mediaType,
        visibility: visibilityValue as PostVisibility,
        isReel,
        visualEffect: effectValue as VisualEffect,
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

  const effectValue = String(formData.get("visualEffect") ?? VisualEffect.NONE);
  if (!Object.values(VisualEffect).includes(effectValue as VisualEffect)) {
    return { error: "Görsel efekti geçersiz." };
  }

  await prisma.story.create({
    data: {
      userId: user.id,
      mediaUrl: saved.mediaUrl,
      mediaType: saved.mediaType,
      visualEffect: effectValue as VisualEffect,
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
    const existingRequest = await prisma.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId: user.id, targetId: target.id } },
    });
    if (existingRequest?.status !== FollowRequestStatus.PENDING) {
      await prisma.$transaction(async (transaction) => {
        await transaction.followRequest.upsert({
          where: { requesterId_targetId: { requesterId: user.id, targetId: target.id } },
          create: { requesterId: user.id, targetId: target.id },
          update: { status: FollowRequestStatus.PENDING },
        });
        await transaction.notification.create({
          data: { userId: target.id, actorId: user.id, type: NotificationType.FOLLOW_REQUEST },
        });
      });
    }
  } else {
    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    });
    if (!existingFollow) {
      await prisma.$transaction([
        prisma.follow.create({ data: { followerId: user.id, followingId: target.id } }),
        prisma.notification.create({
          data: { userId: target.id, actorId: user.id, type: NotificationType.FOLLOW },
        }),
      ]);
    }
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
    prisma.notification.updateMany({
      where: {
        userId: user.id,
        actorId: request.requesterId,
        type: NotificationType.FOLLOW_REQUEST,
        isRead: false,
      },
      data: { isRead: true },
    }),
    prisma.notification.create({
      data: {
        userId: request.requesterId,
        actorId: user.id,
        type: NotificationType.FOLLOW_REQUEST_ACCEPTED,
      },
    }),
  ]);

  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/");
}

export async function rejectFollowRequestAction(requestId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const request = await prisma.followRequest.findFirst({
    where: { id: requestId, targetId: user.id, status: FollowRequestStatus.PENDING },
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.followRequest.update({
      where: { id: request.id },
      data: { status: FollowRequestStatus.REJECTED },
    }),
    prisma.notification.updateMany({
      where: {
        userId: user.id,
        actorId: request.requesterId,
        type: NotificationType.FOLLOW_REQUEST,
        isRead: false,
      },
      data: { isRead: true },
    }),
    prisma.notification.create({
      data: {
        userId: request.requesterId,
        actorId: user.id,
        type: NotificationType.FOLLOW_REQUEST_REJECTED,
      },
    }),
  ]);

  revalidatePath("/notifications");
  revalidatePath(`/profile/${user.username}`);
}

export async function togglePostLikeAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const post = await prisma.post.findFirst({
    where: { AND: [{ id: postId }, visiblePostsWhere(user.id)] },
    select: { id: true, userId: true },
  });
  if (!post) return;

  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
  });
  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } });
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: user.id, postId: post.id } }),
      ...(post.userId === user.id ? [] : [
        prisma.notification.create({
          data: { userId: post.userId, actorId: user.id, type: NotificationType.LIKE, postId: post.id },
        }),
      ]),
    ]);
  }

  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath(`/post/${post.id}`);
}

export async function addPostCommentAction(postId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();
  if (!content || content.length > 1000) return;

  const post = await prisma.post.findFirst({
    where: { AND: [{ id: postId }, visiblePostsWhere(user.id)] },
    select: { id: true, userId: true },
  });
  if (!post) return;

  const comment = await prisma.comment.create({
    data: { postId: post.id, userId: user.id, content },
  });
  if (post.userId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: post.userId,
        actorId: user.id,
        type: NotificationType.COMMENT,
        postId: post.id,
        commentId: comment.id,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath(`/post/${post.id}`);
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}