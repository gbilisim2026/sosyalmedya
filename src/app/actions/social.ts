"use server";

import { hash, verify } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FollowRequestStatus, MediaType, NotificationType, PostVisibility, VisualEffect, ContentAudience } from "@/generated/prisma/enums";
import { getCurrentUser, setThemeCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveUploadedMedia } from "@/lib/uploads";
import { usersCanMessageWhere, visiblePostsWhere, visibleStoriesWhere } from "@/lib/visibility";
import { z } from "zod";
import { isRecommendationCategory } from "@/lib/recommendation-categories";

export type SocialFormState = { error?: string; success?: string; resetKey?: string };

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
  const location = String(formData.get("location") ?? "").trim();
  if (location.length > 160) return { error: "Konum en fazla 160 karakter olabilir." };
  const visibilityValue = String(formData.get("visibility") ?? PostVisibility.PUBLIC);
  const effectValue = String(formData.get("visualEffect") ?? VisualEffect.NONE);
  const audienceValue = String(formData.get("audience") ?? ContentAudience.EVERYONE);
  if (!Object.values(PostVisibility).includes(visibilityValue as PostVisibility)) {
    return { error: "Gönderi görünürlüğü geçersiz." };
  }
  if (!Object.values(VisualEffect).includes(effectValue as VisualEffect)) {
    return { error: "Görsel efekti geçersiz." };
  }
  if (!Object.values(ContentAudience).includes(audienceValue as ContentAudience)) {
    return { error: "Hedef kitle geçersiz." };
  }
  const allowReshare = formData.has("allowReshare");
  const categoryValue = String(formData.get("category") ?? "");
  if (categoryValue && !isRecommendationCategory(categoryValue)) {
    return { error: "İçerik kategorisi geçersiz." };
  }
  const selectedUsernames = String(formData.get("selectedUsernames") ?? "")
    .split(",")
    .map((name) => name.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  if (audienceValue === ContentAudience.SELECTED && selectedUsernames.length === 0) {
    return { error: "Belirli kişiler hedef kitlesi için en az bir kullanıcı adı gir." };
  }
  const selectedUsers = selectedUsernames.length
    ? await prisma.user.findMany({ where: { usernameKey: { in: selectedUsernames } }, select: { id: true } })
    : [];
  if (selectedUsers.length !== new Set(selectedUsernames).size) {
    return { error: "Hedef kitlede bulunamayan kullanıcı adı var." };
  }
  const isReel = formData.get("isReel") === "on";

  const mediaEntries = formData.getAll("media");
  if (mediaEntries.some((entry) => !(entry instanceof File))) {
    return { error: "Seçilen medya dosyaları geçersiz." };
  }
  const selectedFiles = mediaEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (selectedFiles.length > 10) {
    return { error: "Bir gönderide en fazla 10 fotoğraf paylaşabilirsin." };
  }
  if (selectedFiles.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) {
    return { error: "Gönderideki dosyaların toplam boyutu en fazla 100 MB olabilir." };
  }
  if (selectedFiles.some((file) => file.type.startsWith("video/")) && selectedFiles.length > 1) {
    return { error: "Bir gönderide yalnızca tek video paylaşabilirsin." };
  }
  if (selectedFiles.some((file) => file.type.startsWith("video/")) && selectedFiles.some((file) => file.type.startsWith("image/"))) {
    return { error: "Fotoğraf ve videoyu aynı gönderide birlikte paylaşamazsın." };
  }
  const uploadedMedia: Array<{ mediaUrl: string; mediaType: MediaType }> = [];
  let mediaUrl: string | null = null;
  let mediaType: MediaType = MediaType.TEXT;

  if (selectedFiles.length > 0) {
    try {
      for (const file of selectedFiles) {
        const saved = await saveUploadedMedia(file);
        uploadedMedia.push(saved);
      }
      mediaUrl = uploadedMedia[0].mediaUrl;
      mediaType = uploadedMedia[0].mediaType;
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
        category: categoryValue || null,
        location: location || null,
        mediaUrl,
        mediaType,
        visibility: visibilityValue as PostVisibility,
        audience: audienceValue as ContentAudience,
        isReel,
        visualEffect: effectValue as VisualEffect,
        allowReshare,
        ...(mediaType === MediaType.PHOTO
          ? {
              mediaItems: {
                create: uploadedMedia.map(({ mediaUrl: itemUrl }, position) => ({
                  mediaUrl: itemUrl,
                  position,
                })),
              },
            }
          : {}),
        ...(audienceValue === ContentAudience.SELECTED
          ? { audienceUsers: { createMany: { data: selectedUsers.map(({ id }) => ({ userId: id })) } } }
          : {}),
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
  const caption = String(formData.get("caption") ?? "").trim();
  if (caption.length > 1000) return { error: "Hikâye metni en fazla 1000 karakter olabilir." };

  const effectValue = String(formData.get("visualEffect") ?? VisualEffect.NONE);
  const audienceValue = String(formData.get("audience") ?? ContentAudience.EVERYONE);
  if (!Object.values(VisualEffect).includes(effectValue as VisualEffect)) {
    return { error: "Görsel efekti geçersiz." };
  }
  if (!Object.values(ContentAudience).includes(audienceValue as ContentAudience)) {
    return { error: "Hedef kitle geçersiz." };
  }
  const musicTrackId = String(formData.get("musicTrackId") ?? "");
  const musicTitle = String(formData.get("musicTitle") ?? "").trim();
  const musicArtist = String(formData.get("musicArtist") ?? "").trim();
  const musicArtworkUrl = String(formData.get("musicArtworkUrl") ?? "");
  const musicPreviewUrl = String(formData.get("musicPreviewUrl") ?? "");
  const musicTrackUrl = String(formData.get("musicTrackUrl") ?? "");
  const musicStartSeconds = Number(formData.get("musicStartSeconds") ?? 0);
  const musicDurationSeconds = Number(formData.get("musicDurationSeconds") ?? 15);
  const musicLabelStyle = String(formData.get("musicLabelStyle") ?? "compact");
  const musicLabelPosition = String(formData.get("musicLabelPosition") ?? "bottom");
  const musicLabelScale = Number(formData.get("musicLabelScale") ?? 1);
  const hasMusic = Boolean(musicTrackId || musicTitle || musicArtist || musicPreviewUrl);
  if (hasMusic && (
    !/^\d{1,20}$/.test(musicTrackId) || !musicTitle || musicTitle.length > 200 ||
    !musicArtist || musicArtist.length > 200 || !isAppleCatalogUrl(musicArtworkUrl) ||
    !isAppleCatalogUrl(musicPreviewUrl) || !isAppleCatalogUrl(musicTrackUrl) ||
    !Number.isInteger(musicStartSeconds) || musicStartSeconds < 0 || musicStartSeconds > 20 ||
    !Number.isInteger(musicDurationSeconds) || musicDurationSeconds < 5 || musicDurationSeconds > 30 ||
    !["compact", "cover"].includes(musicLabelStyle) ||
    !["top", "bottom"].includes(musicLabelPosition) ||
    !Number.isInteger(musicLabelScale) || musicLabelScale < 1 || musicLabelScale > 3
  )) {
    return { error: "Hikâye müziği bilgileri geçersiz. Lütfen kataloğu kullanarak yeniden seç." };
  }

  const selectedUsernames = String(formData.get("selectedUsernames") ?? "")
    .split(",")
    .map((name) => name.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  if (audienceValue === ContentAudience.SELECTED && selectedUsernames.length === 0) {
    return { error: "Belirli kişiler hedef kitlesi için en az bir kullanıcı adı gir." };
  }
  const selectedUsers = selectedUsernames.length
    ? await prisma.user.findMany({ where: { usernameKey: { in: selectedUsernames } }, select: { id: true } })
    : [];
  if (selectedUsers.length !== new Set(selectedUsernames).size) {
    return { error: "Hedef kitlede bulunamayan kullanıcı adı var." };
  }

  let saved: Awaited<ReturnType<typeof saveUploadedMedia>>;
  try {
    saved = await saveUploadedMedia(selectedFile);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dosya yüklenemedi." };
  }
  const createdAt = new Date();
  await prisma.story.create({
    data: {
      userId: user.id,
      caption: caption || null,
      mediaUrl: saved.mediaUrl,
      mediaType: saved.mediaType,
      visualEffect: effectValue as VisualEffect,
      ...(hasMusic ? {
        musicTrackId,
        musicTitle,
        musicArtist,
        musicArtworkUrl,
        musicPreviewUrl,
        musicTrackUrl,
        musicStartSeconds,
        musicDurationSeconds,
        musicLabelStyle,
        musicLabelPosition,
        musicLabelScale,
      } : {}),
      audience: audienceValue as ContentAudience,
      allowReshare: formData.get("allowReshare") === "on",
      createdAt,
      ...(audienceValue === ContentAudience.SELECTED
        ? { audienceUsers: { createMany: { data: selectedUsers.map(({ id }) => ({ userId: id })) } } }
        : {}),
      expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  redirect("/");
}

export async function updateStoryMusicAction(storyId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const story = await prisma.story.findFirst({
    where: { id: storyId, userId: user.id, expiresAt: { gt: new Date() }, isArchived: false },
    select: { id: true },
  });
  if (!story) return;
  if (formData.get("clearMusic") === "true") {
    await prisma.story.update({
      where: { id: story.id },
      data: {
        musicTrackId: null,
        musicTitle: null,
        musicArtist: null,
        musicArtworkUrl: null,
        musicPreviewUrl: null,
        musicTrackUrl: null,
        musicStartSeconds: null,
        musicDurationSeconds: null,
        musicLabelStyle: null,
        musicLabelPosition: null,
        musicLabelScale: null,
      },
    });
  } else {
    const trackId = String(formData.get("musicTrackId") ?? "");
    const title = String(formData.get("musicTitle") ?? "").trim();
    const artist = String(formData.get("musicArtist") ?? "").trim();
    const artworkUrl = String(formData.get("musicArtworkUrl") ?? "");
    const previewUrl = String(formData.get("musicPreviewUrl") ?? "");
    const trackUrl = String(formData.get("musicTrackUrl") ?? "");
    const startSeconds = Number(formData.get("musicStartSeconds"));
    const durationSeconds = Number(formData.get("musicDurationSeconds"));
    const labelStyle = String(formData.get("musicLabelStyle") ?? "");
    const labelPosition = String(formData.get("musicLabelPosition") ?? "");
    const labelScale = Number(formData.get("musicLabelScale"));
    if (!/^\d{1,20}$/.test(trackId) || !title || title.length > 200 ||
        !artist || artist.length > 200 || !isAppleCatalogUrl(artworkUrl) ||
        !isAppleCatalogUrl(previewUrl) || !isAppleCatalogUrl(trackUrl) ||
        !Number.isInteger(startSeconds) || startSeconds < 0 || startSeconds > 20 ||
        !Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 30 ||
        !["compact", "cover"].includes(labelStyle) || !["top", "bottom"].includes(labelPosition) ||
        !Number.isInteger(labelScale) || labelScale < 1 || labelScale > 3) {
      redirect(`/stories/${storyId}?error=music`);
    }
    await prisma.story.update({
      where: { id: story.id },
      data: {
        musicTrackId: trackId,
        musicTitle: title,
        musicArtist: artist,
        musicArtworkUrl: artworkUrl,
        musicPreviewUrl: previewUrl,
        musicTrackUrl: trackUrl,
        musicStartSeconds: startSeconds,
        musicDurationSeconds: durationSeconds,
        musicLabelStyle: labelStyle,
        musicLabelPosition: labelPosition,
        musicLabelScale: labelScale,
      },
    });
  }
  revalidatePath(`/stories/${storyId}`);
  revalidatePath(`/profile/${user.username}`);
}

export async function reshareStoryAction(storyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const original = await prisma.story.findFirst({
    where: {
      id: storyId,
      isArchived: false,
      expiresAt: { gt: new Date() },
      audience: ContentAudience.EVERYONE,
      allowReshare: true,
      user: { isPrivate: false },
      AND: [visibleStoriesWhere(user.id)],
    },
    select: {
      id: true, mediaUrl: true, mediaType: true, visualEffect: true, caption: true, userId: true,
      musicTrackId: true, musicTitle: true, musicArtist: true, musicArtworkUrl: true, musicPreviewUrl: true, musicTrackUrl: true,
      musicStartSeconds: true, musicDurationSeconds: true, musicLabelStyle: true,
      musicLabelPosition: true, musicLabelScale: true,
    },
  });
  if (!original || original.userId === user.id) redirect("/");
  const createdAt = new Date();
  await prisma.$transaction([
    prisma.story.create({
      data: {
        userId: user.id,
        mediaUrl: original.mediaUrl,
        mediaType: original.mediaType,
        visualEffect: original.visualEffect,
        caption: original.caption,
        musicTrackId: original.musicTrackId,
        musicTitle: original.musicTitle,
        musicArtist: original.musicArtist,
        musicArtworkUrl: original.musicArtworkUrl,
        musicPreviewUrl: original.musicPreviewUrl,
        musicTrackUrl: original.musicTrackUrl,
        musicStartSeconds: original.musicStartSeconds,
        musicDurationSeconds: original.musicDurationSeconds,
        musicLabelStyle: original.musicLabelStyle,
        musicLabelPosition: original.musicLabelPosition,
        musicLabelScale: original.musicLabelScale,
        audience: ContentAudience.EVERYONE,
        sharedStoryId: original.id,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.notification.create({
      data: { userId: original.userId, actorId: user.id, type: NotificationType.RESHARE },
    }),
  ]);
  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  redirect("/");
}

export async function saveProfileNameAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length > 60) redirect(`/profile/${encodeURIComponent(user.username)}?profileError=name`);
  await prisma.user.update({ where: { id: user.id }, data: { displayName: displayName || null } });
  revalidatePath("/", "layout");
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/search");
  revalidatePath("/messages", "layout");
  redirect(`/profile/${encodeURIComponent(user.username)}?profileUpdated=1`);
}

export async function saveProfileNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const note = String(formData.get("note") ?? "").trim();
  const audienceValue = String(formData.get("audience") ?? ContentAudience.EVERYONE);
  const hours = Number(formData.get("duration"));
  if (note.length > 180 || !([ContentAudience.EVERYONE, ContentAudience.FOLLOWERS, ContentAudience.CLOSE_FRIENDS] as ContentAudience[]).includes(audienceValue as ContentAudience) ||
      ![1, 6, 12, 24].includes(hours)) {
    redirect(`/profile/${encodeURIComponent(user.username)}?profileError=note`);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      profileNote: note || null,
      profileNoteAudience: audienceValue as ContentAudience,
      profileNoteExpiresAt: note ? new Date(Date.now() + hours * 60 * 60 * 1000) : null,
    },
  });
  revalidatePath(`/profile/${user.username}`);
}

const appleCatalogHosts = new Set(["audio-ssl.itunes.apple.com", "music.apple.com", "is1-ssl.mzstatic.com", "is2-ssl.mzstatic.com", "is3-ssl.mzstatic.com", "is4-ssl.mzstatic.com", "is5-ssl.mzstatic.com"]);

function isAppleCatalogUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && appleCatalogHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export async function saveProfileMusicAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const trackId = String(formData.get("trackId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const artworkUrl = String(formData.get("artworkUrl") ?? "");
  const previewUrl = String(formData.get("previewUrl") ?? "");
  const trackUrl = String(formData.get("trackUrl") ?? "");
  if (!/^\d{1,20}$/.test(trackId) || !title || title.length > 200 || !artist || artist.length > 200 ||
      !isAppleCatalogUrl(artworkUrl) || !isAppleCatalogUrl(previewUrl) || !isAppleCatalogUrl(trackUrl)) {
    redirect(`/profile/${encodeURIComponent(user.username)}?profileError=music`);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      profileMusicTrackId: trackId,
      profileMusicTitle: title,
      profileMusicArtist: artist,
      profileMusicArtworkUrl: artworkUrl,
      profileMusicPreviewUrl: previewUrl,
      profileMusicTrackUrl: trackUrl,
    },
  });
  revalidatePath(`/profile/${user.username}`);
}

export async function removeProfileMusicAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      profileMusicTrackId: null,
      profileMusicTitle: null,
      profileMusicArtist: null,
      profileMusicArtworkUrl: null,
      profileMusicPreviewUrl: null,
      profileMusicTrackUrl: null,
    },
  });
  revalidatePath(`/profile/${user.username}`);
}

export async function updateThemePreferenceAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const theme = String(formData.get("theme") ?? "");
  if (!["SYSTEM", "LIGHT", "DARK"].includes(theme)) redirect("/settings?error=theme");
  await prisma.user.update({ where: { id: user.id }, data: { themePreference: theme as "SYSTEM" | "LIGHT" | "DARK" } });
  await setThemeCookie(theme as "SYSTEM" | "LIGHT" | "DARK");
  revalidatePath("/", "layout");
  redirect("/settings?themeUpdated=1");
}

export async function updateActivityStatusPreferenceAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.user.update({ where: { id: user.id }, data: { showActivityStatus: formData.get("showActivityStatus") === "on" } });
  revalidatePath("/settings");
  revalidatePath("/messages");
  redirect("/settings?statusUpdated=1");
}

export async function saveRecommendationPreferencesAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const selected = formData.getAll("interests").map(String);
  if (selected.length > 9 || selected.some((item) => !isRecommendationCategory(item))) {
    redirect("/settings/interests?error=category");
  }
  const enabled = formData.get("personalizedEnabled") === "on";
  await prisma.$transaction(async (transaction) => {
    const preference = await transaction.recommendationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, personalizedEnabled: enabled },
      update: { personalizedEnabled: enabled },
      select: { id: true },
    });
    await transaction.userInterest.deleteMany({ where: { preferenceId: preference.id } });
    if (selected.length) {
      await transaction.userInterest.createMany({
        data: [...new Set(selected)].map((category) => ({ preferenceId: preference.id, category })),
      });
    }
  });
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/settings/interests");
  redirect("/settings/interests?saved=1");
}

export async function clearSearchHistoryAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.searchHistory.deleteMany({ where: { userId: user.id } });
  revalidatePath("/settings/interests");
}

export async function clearWatchHistoryAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.$transaction([
    prisma.postView.updateMany({ where: { viewerId: user.id }, data: { hiddenFromHistory: true } }),
    prisma.storyView.updateMany({ where: { viewerId: user.id }, data: { hiddenFromHistory: true } }),
  ]);
  revalidatePath("/watch-history");
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function recordRecommendationFeedbackAction(
  type: "NOT_INTERESTED_POST" | "LESS_CATEGORY" | "HIDE_ACCOUNT",
  targetId: string,
  category: string | null,
  _formData: FormData,
) {
  void _formData;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let feedbackKey: string;
  let data: { postId?: string; targetUserId?: string; category?: string };
  if (type === "NOT_INTERESTED_POST") {
    const post = await prisma.post.findFirst({
      where: { id: targetId, userId: { not: user.id }, AND: [visiblePostsWhere(user.id)] },
      select: { id: true },
    });
    if (!post) return;
    feedbackKey = `post:${post.id}`;
    data = { postId: post.id };
  } else if (type === "HIDE_ACCOUNT") {
    const target = await prisma.user.findFirst({
      where: { id: targetId, NOT: [{ blocksCreated: { some: { blockedId: user.id } } }, { blocksReceived: { some: { blockerId: user.id } } }] },
      select: { id: true },
    });
    if (!target || target.id === user.id) return;
    feedbackKey = `account:${target.id}`;
    data = { targetUserId: target.id };
  } else {
    if (!category || !isRecommendationCategory(category)) return;
    feedbackKey = `category:${category}`;
    data = { category };
  }
  await prisma.recommendationFeedback.upsert({
    where: { userId_feedbackKey: { userId: user.id, feedbackKey } },
    create: { userId: user.id, feedbackKey, type, ...data },
    update: { type, ...data },
  });
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function dismissSuggestedAccountAction(targetId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (targetId === user.id) return;
  const target = await prisma.user.findFirst({
    where: { id: targetId, isPrivate: false },
    select: { id: true },
  });
  if (!target) return;
  await prisma.suggestedAccountDismissal.upsert({
    where: { userId_targetId: { userId: user.id, targetId: target.id } },
    create: { userId: user.id, targetId: target.id },
    update: {},
  });
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/people/suggested");
  revalidatePath(`/profile/${user.username}`);
}

export async function togglePostLikeCountAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const post = await prisma.post.findFirst({
    where: { id: postId, userId: user.id, sharedPostId: null },
    select: { hideLikeCount: true },
  });
  if (!post) return;
  await prisma.post.update({ where: { id: postId }, data: { hideLikeCount: !post.hideLikeCount } });
  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath(`/profile/${user.username}`);
}

export async function editPostAction(postId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const caption = String(formData.get("caption") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (caption.length > 2200 || location.length > 160 || (category && !isRecommendationCategory(category))) redirect(`/post/${postId}?error=edit`);
  const post = await prisma.post.findFirst({ where: { id: postId, userId: user.id, sharedPostId: null }, select: { id: true } });
  if (!post) redirect("/");
  const hashtags = getHashtags(caption);
  await prisma.$transaction(async (transaction) => {
    await transaction.post.update({ where: { id: post.id }, data: { caption: caption || null, location: location || null, category: category || null } });
    await transaction.postHashtag.deleteMany({ where: { postId: post.id } });
    for (const { tagKey, name } of hashtags) {
      const hashtag = await transaction.hashtag.upsert({
        where: { tagKey },
        create: { tagKey, name },
        update: { name },
      });
      await transaction.postHashtag.create({ data: { postId: post.id, hashtagId: hashtag.id } });
    }
  });
  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath(`/post/${post.id}`);
  revalidatePath(`/profile/${user.username}`);
  redirect(`/post/${post.id}?updated=1`);
}

export async function toggleBlockUserAction(username: string, _previousState: SocialFormState): Promise<SocialFormState> {
  void _previousState;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!target || target.id === user.id) return { error: "Bu hesap için engelleme yapılamıyor." };
  const existing = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.userBlock.delete({ where: { id: existing.id } });
    revalidatePath(`/profile/${target.username}`);
    return { success: "Engel kaldırıldı.", resetKey: "unblocked" };
  }
  await prisma.$transaction([
    prisma.userBlock.create({ data: { blockerId: user.id, blockedId: target.id } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: user.id, followingId: target.id }, { followerId: target.id, followingId: user.id }] } }),
    prisma.followRequest.deleteMany({ where: { OR: [{ requesterId: user.id, targetId: target.id }, { requesterId: target.id, targetId: user.id }] } }),
    prisma.closeFriend.deleteMany({ where: { OR: [{ ownerId: user.id, friendId: target.id }, { ownerId: target.id, friendId: user.id }] } }),
  ]);
  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/");
  revalidatePath("/messages");
  return { success: "Hesap engellendi.", resetKey: "blocked" };
}

export async function followUserFormAction(username: string, _previousState: SocialFormState): Promise<SocialFormState> {
  void _previousState;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const target = await prisma.user.findUnique({ where: { usernameKey: username.toLowerCase() }, select: { id: true, isPrivate: true } });
  if (!target || target.id === user.id) return { error: "Hesap takip edilemiyor." };
  const blocked = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: user.id, blockedId: target.id }, { blockerId: target.id, blockedId: user.id }] },
    select: { id: true },
  });
  if (blocked) return { error: "Engelleme nedeniyle takip işlemi yapılamıyor." };
  if (target.isPrivate) {
    const request = await prisma.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId: user.id, targetId: target.id } },
      select: { status: true },
    });
    await prisma.followRequest.upsert({
      where: { requesterId_targetId: { requesterId: user.id, targetId: target.id } },
      create: { requesterId: user.id, targetId: target.id },
      update: { status: FollowRequestStatus.PENDING },
    });
    if (request?.status !== FollowRequestStatus.PENDING) {
      await prisma.notification.create({ data: { userId: target.id, actorId: user.id, type: NotificationType.FOLLOW_REQUEST } });
    }
  } else {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.$transaction([
        prisma.follow.create({ data: { followerId: user.id, followingId: target.id } }),
        prisma.userActivity.create({ data: { userId: user.id, targetUserId: target.id, action: "FOLLOWED" } }),
        prisma.notification.create({ data: { userId: target.id, actorId: user.id, type: NotificationType.FOLLOW } }),
      ]);
    }
  }
  revalidatePath("/");
  return { success: target.isPrivate ? "Takip isteği gönderildi." : "Takip edildi.", resetKey: new Date().toISOString() };
}

export async function updateAvatarAction(
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Profil fotoğrafı seç." };
  if (file.type.startsWith("video/")) return { error: "Profil fotoğrafı için görsel dosyası seç." };
  const scale = Number(formData.get("avatarScale"));
  const offsetX = Number(formData.get("avatarOffsetX"));
  const offsetY = Number(formData.get("avatarOffsetY"));
  if (!Number.isFinite(scale) || scale < 1 || scale > 3 ||
      !Number.isInteger(offsetX) || offsetX < 0 || offsetX > 100 ||
      !Number.isInteger(offsetY) || offsetY < 0 || offsetY > 100) {
    return { error: "Profil fotoğrafı kırpma ayarları geçersiz." };
  }
  let uploaded: Awaited<ReturnType<typeof saveUploadedMedia>>;
  try {
    uploaded = await saveUploadedMedia(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Profil fotoğrafı yüklenemedi." };
  }
  if (uploaded.mediaType !== MediaType.PHOTO) return { error: "Profil fotoğrafı için görsel dosyası seç." };
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: uploaded.mediaUrl, avatarScale: scale, avatarOffsetX: offsetX, avatarOffsetY: offsetY },
  });
  revalidatePath("/", "layout");
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/search");
  revalidatePath("/messages", "layout");
  revalidatePath("/notifications", "layout");
  return { success: "Profil fotoğrafın güncellendi." };
}

export async function removeAvatarAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null, avatarScale: 1, avatarOffsetX: 50, avatarOffsetY: 50 },
  });
  revalidatePath("/", "layout");
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/search");
  revalidatePath("/messages", "layout");
  revalidatePath("/notifications", "layout");
}

export async function deleteStoryAction(storyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.story.deleteMany({ where: { id: storyId, userId: user.id } });
  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/stories/archive");
}

export async function reshareArchivedStoryAction(storyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const story = await prisma.story.findFirst({
    where: { id: storyId, userId: user.id, OR: [{ isArchived: true }, { expiresAt: { lte: new Date() } }] },
    include: { audienceUsers: { select: { userId: true } } },
  });
  if (!story) return;
  const now = new Date();
  await prisma.story.create({
    data: {
      userId: user.id,
      caption: story.caption,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      visualEffect: story.visualEffect,
      audience: story.audience,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ...(story.audience === ContentAudience.SELECTED
        ? { audienceUsers: { createMany: { data: story.audienceUsers.map(({ userId }) => ({ userId })) } } }
        : {}),
    },
  });
  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/stories/archive");
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
  const isBlocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: target.id },
        { blockerId: target.id, blockedId: user.id },
      ],
    },
    select: { id: true },
  });
  if (isBlocked) return;

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
        prisma.userActivity.create({ data: { userId: user.id, targetUserId: target.id, action: "FOLLOWED" } }),
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

  const removed = await prisma.follow.deleteMany({ where: { followerId: user.id, followingId: target.id } });
  if (removed.count) {
    await prisma.userActivity.create({ data: { userId: user.id, targetUserId: target.id, action: "UNFOLLOWED" } });
  }
  await prisma.followRequest.deleteMany({ where: { requesterId: user.id, targetId: target.id } });
  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/");
}

export async function withdrawFollowRequestAction(username: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!target || target.id === user.id) return;
  await prisma.$transaction([
    prisma.followRequest.deleteMany({
      where: { requesterId: user.id, targetId: target.id, status: FollowRequestStatus.PENDING },
    }),
    prisma.notification.updateMany({
      where: { userId: target.id, actorId: user.id, type: NotificationType.FOLLOW_REQUEST, isRead: false },
      data: { isRead: true },
    }),
  ]);
  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/notifications");
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
  const gifUrl = String(formData.get("gifUrl") ?? "");
  const gifAttributionUrl = String(formData.get("gifAttributionUrl") ?? "");
  const gifLicense = String(formData.get("gifLicense") ?? "");
  let validGif = false;
  if (gifUrl || gifAttributionUrl || gifLicense) {
    try {
      const media = new URL(gifUrl);
      const attribution = new URL(gifAttributionUrl);
      validGif = media.protocol === "https:" &&
        media.hostname === "upload.wikimedia.org" &&
        media.pathname.toLowerCase().endsWith(".gif") &&
        attribution.protocol === "https:" &&
        attribution.hostname === "commons.wikimedia.org" &&
        gifLicense.length > 0 && gifLicense.length <= 100;
    } catch {
      validGif = false;
    }
  }
  if ((!content && !validGif) || content.length > 1000 || (gifUrl && !validGif)) return;

  const post = await prisma.post.findFirst({
    where: { AND: [{ id: postId }, visiblePostsWhere(user.id)] },
    select: { id: true, userId: true },
  });
  if (!post) return;

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      userId: user.id,
      content: content || "GIF",
      gifUrl: validGif ? gifUrl : null,
      gifAttributionUrl: validGif ? gifAttributionUrl : null,
      gifLicense: validGif ? gifLicense : null,
    },
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

export async function toggleSavedPostAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const post = await prisma.post.findFirst({
    where: { id: postId, AND: [visiblePostsWhere(user.id)] },
    select: { id: true },
  });
  if (!post) return;
  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.savedPost.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedPost.create({ data: { userId: user.id, postId: post.id } });
  }
  revalidatePath("/saved");
  revalidatePath("/");
}

export async function archivePostAction(postId: string, archived: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.post.updateMany({
    where: { id: postId, userId: user.id },
    data: { isArchived: archived },
  });
  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/archive");
  revalidatePath("/");
}

export async function togglePostFlagAction(postId: string, flag: "pin" | "feature") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const post = await prisma.post.findFirst({
    where: { id: postId, userId: user.id, isArchived: false },
    select: { isPinned: true, isFeatured: true },
  });
  if (!post) return;
  await prisma.post.update({
    where: { id: postId },
    data: flag === "pin" ? { isPinned: !post.isPinned } : { isFeatured: !post.isFeatured },
  });
  revalidatePath(`/profile/${user.username}`);
}

export async function togglePostResharePermissionAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const post = await prisma.post.findFirst({
    where: { id: postId, userId: user.id, sharedPostId: null },
    select: { allowReshare: true },
  });
  if (!post) return;
  await prisma.post.update({ where: { id: postId }, data: { allowReshare: !post.allowReshare } });
  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
}

export async function resharePostAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const original = await prisma.post.findFirst({
    where: {
      id: postId,
      sharedPostId: null,
      allowReshare: true,
      visibility: PostVisibility.PUBLIC,
      audience: ContentAudience.EVERYONE,
      AND: [visiblePostsWhere(user.id)],
      user: { isPrivate: false },
    },
    select: { id: true, userId: true },
  });
  if (!original || original.userId === user.id) return;
  await prisma.post.create({
    data: {
      userId: user.id,
      sharedPostId: original.id,
      caption: null,
      mediaType: MediaType.TEXT,
      visibility: PostVisibility.PUBLIC,
      audience: ContentAudience.EVERYONE,
    },
  });
  await prisma.notification.create({
    data: { userId: original.userId, actorId: user.id, type: NotificationType.RESHARE, postId: original.id },
  });
  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath(`/profile/${user.username}`);
}

export async function updateAccountSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_]+$/),
    isPrivate: z.enum(["on", "off"]).optional(),
  }).safeParse({
    username: formData.get("username"),
    isPrivate: formData.get("isPrivate") === "on" ? "on" : "off",
  });
  if (!result.success) {
    redirect("/settings?error=username");
  }
  const username = result.data.username;
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { username, usernameKey: username.toLowerCase(), isPrivate: result.data.isPrivate === "on" },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      redirect("/settings?error=taken");
    }
    throw error;
  }
  revalidatePath(`/profile/${user.username}`);
  revalidatePath(`/profile/${username}`);
  redirect("/settings?updated=1");
}

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (!(await verify(user.passwordHash, currentPassword))) redirect("/settings?error=password");
  if (newPassword.length < 8 || newPassword.length > 128) redirect("/settings?error=password");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(newPassword) } });
  redirect("/settings?passwordUpdated=1");
}

export async function blockUserAction(username: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!target || target.id === user.id) return;
  await prisma.$transaction([
    prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
      create: { blockerId: user.id, blockedId: target.id },
      update: {},
    }),
    prisma.follow.deleteMany({
      where: { OR: [
        { followerId: user.id, followingId: target.id },
        { followerId: target.id, followingId: user.id },
      ] },
    }),
    prisma.followRequest.deleteMany({
      where: { OR: [
        { requesterId: user.id, targetId: target.id },
        { requesterId: target.id, targetId: user.id },
      ] },
    }),
    prisma.closeFriend.deleteMany({
      where: { OR: [
        { ownerId: user.id, friendId: target.id },
        { ownerId: target.id, friendId: user.id },
      ] },
    }),
    prisma.directMessage.updateMany({
      where: {
        senderId: target.id,
        isRead: false,
        conversation: {
          OR: [
            { participantOneId: user.id, participantTwoId: target.id },
            { participantOneId: target.id, participantTwoId: user.id },
          ],
        },
      },
      data: { isRead: true },
    }),
    prisma.notification.updateMany({
      where: { userId: user.id, actorId: target.id, isRead: false },
      data: { isRead: true },
    }),
  ]);
  revalidatePath(`/profile/${target.username}`);
  revalidatePath("/");
  revalidatePath("/messages");
}

export async function unblockUserAction(blockId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.userBlock.deleteMany({ where: { id: blockId, blockerId: user.id } });
  revalidatePath("/settings");
}

export async function toggleCloseFriendAction(friendId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (friendId === user.id) return;
  const existing = await prisma.closeFriend.findUnique({
    where: { ownerId_friendId: { ownerId: user.id, friendId } },
    select: { id: true },
  });
  if (existing) await prisma.closeFriend.delete({ where: { id: existing.id } });
  else await prisma.closeFriend.create({ data: { ownerId: user.id, friendId } });
  revalidatePath("/settings");
}

export async function startConversationAction(username: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const target = await prisma.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true },
  });
  if (!target || target.id === user.id) redirect("/messages");
  const allowed = await prisma.user.findFirst({
    where: { id: target.id, AND: [usersCanMessageWhere(user.id)] },
    select: { id: true },
  });
  if (!allowed) redirect("/messages");
  const [participantOneId, participantTwoId] = [user.id, target.id].sort();
  const conversation = await prisma.directConversation.upsert({
    where: { pairKey: `${participantOneId}:${participantTwoId}` },
    create: { pairKey: `${participantOneId}:${participantTwoId}`, participantOneId, participantTwoId, status: "PENDING", requestedById: user.id },
    update: {},
    select: { id: true },
  });
  redirect(`/messages/${conversation.id}`);
}

export async function sendDirectMessageAction(
  conversationId: string,
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const content = String(formData.get("content") ?? "").trim();
  const file = formData.get("media");
  const hasMedia = file instanceof File && file.size > 0;
  if ((!content && !hasMedia) || content.length > 4000) {
    return { error: "Bir mesaj yaz veya fotoğraf seç. Mesaj en fazla 4000 karakter olabilir." };
  }
  if (hasMedia && file.type.startsWith("video/")) return { error: "DM üzerinden yalnızca fotoğraf gönderilebilir." };
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participantOneId: user.id }, { participantTwoId: user.id }],
    },
    select: {
      id: true,
      participantOneId: true,
      participantTwoId: true,
      status: true,
      requestedById: true,
    },
  });
  if (!conversation) return { error: "Sohbet bulunamadı." };
  if (conversation.status === "PENDING" && conversation.requestedById !== user.id) {
    return { error: "Mesaj isteği kabul edilene kadar yanıt gönderemezsin." };
  }
  const recipientId = conversation.participantOneId === user.id
    ? conversation.participantTwoId
    : conversation.participantOneId;
  const recipient = await prisma.user.findFirst({
    where: { id: recipientId, AND: [usersCanMessageWhere(user.id)] },
    select: { id: true },
  });
  if (!recipient) return { error: "Bu kullanıcıya mesaj gönderilemiyor." };
  let mediaUrl: string | null = null;
  if (hasMedia) {
    try {
      const saved = await saveUploadedMedia(file);
      if (saved.mediaType !== MediaType.PHOTO) return { error: "DM üzerinden yalnızca fotoğraf gönderilebilir." };
      mediaUrl = saved.mediaUrl;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Fotoğraf yüklenemedi." };
    }
  }
  await prisma.$transaction([
    prisma.directMessage.create({
      data: { conversationId, senderId: user.id, content, mediaUrl, mediaType: mediaUrl ? MediaType.PHOTO : null },
    }),
    prisma.notification.create({ data: { userId: recipientId, actorId: user.id, type: NotificationType.MESSAGE } }),
    prisma.directConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { success: "Mesaj gönderildi.", resetKey: new Date().toISOString() };
}

export async function sendStoryReplyAction(
  storyId: string,
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();
  if (!content || content.length > 4000) {
    return { error: "Yanıtını yaz (en fazla 4000 karakter)." };
  }
  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      userId: { not: user.id },
      isArchived: false,
      expiresAt: { gt: new Date() },
      AND: [visibleStoriesWhere(user.id)],
    },
    select: { userId: true },
  });
  if (!story) return { error: "Bu hikâyeye artık yanıt verilemiyor." };
  const recipient = await prisma.user.findFirst({
    where: { id: story.userId, AND: [usersCanMessageWhere(user.id)] },
    select: { id: true },
  });
  if (!recipient) return { error: "Bu kullanıcıya mesaj gönderilemiyor." };

  const [participantOneId, participantTwoId] = [user.id, recipient.id].sort();
  const conversation = await prisma.directConversation.upsert({
    where: { pairKey: `${participantOneId}:${participantTwoId}` },
    create: {
      pairKey: `${participantOneId}:${participantTwoId}`,
      participantOneId,
      participantTwoId,
      status: "PENDING",
      requestedById: user.id,
    },
    update: {},
    select: { id: true, status: true, requestedById: true },
  });
  if (conversation.status === "PENDING" && conversation.requestedById !== user.id) {
    return { error: "Yanıt göndermek için önce mesaj isteğini kabul etmelisin." };
  }

  await prisma.$transaction([
    prisma.directMessage.create({
      data: { conversationId: conversation.id, senderId: user.id, content },
    }),
    prisma.notification.create({
      data: { userId: recipient.id, actorId: user.id, type: NotificationType.MESSAGE },
    }),
    prisma.directConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);
  revalidatePath(`/messages/${conversation.id}`);
  revalidatePath("/messages");
  return { success: "Yanıtın mesaj olarak gönderildi.", resetKey: new Date().toISOString() };
}

export async function shareSongOrStatusAction(
  conversationId: string,
  _previousState: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const kind = String(formData.get("kind") ?? "");
  const songTitle = String(formData.get("songTitle") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!["SONG", "STATUS"].includes(kind) || note.length > 240 ||
      (kind === "SONG" && (!songTitle || songTitle.length > 200)) ||
      (kind === "STATUS" && !note)) {
    return { error: "Şarkı veya durum paylaşımı bilgileri geçersiz." };
  }
  const conversation = await prisma.directConversation.findFirst({
    where: { id: conversationId, OR: [{ participantOneId: user.id }, { participantTwoId: user.id }] },
    select: { id: true, status: true, requestedById: true, participantOneId: true, participantTwoId: true },
  });
  if (!conversation || (conversation.status === "PENDING" && conversation.requestedById !== user.id)) {
    return { error: "Bu sohbette paylaşım yapılamıyor." };
  }
  const recipientId = conversation.participantOneId === user.id ? conversation.participantTwoId : conversation.participantOneId;
  const recipient = await prisma.user.findFirst({
    where: { id: recipientId, AND: [usersCanMessageWhere(user.id)] },
    select: { id: true },
  });
  if (!recipient) return { error: "Bu kullanıcıya mesaj gönderilemiyor." };
  await prisma.$transaction([
    prisma.directMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content: "",
        kind: kind === "SONG" ? "SONG" : "STATUS",
        sharedSongTitle: kind === "SONG" ? songTitle : null,
        sharedNote: note || null,
      },
    }),
    prisma.notification.create({ data: { userId: recipient.id, actorId: user.id, type: NotificationType.MESSAGE } }),
    prisma.directConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { success: kind === "SONG" ? "Şarkı paylaşıldı." : "Durum paylaşıldı.", resetKey: new Date().toISOString() };
}

export async function respondToMessageRequestAction(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      status: "PENDING",
      requestedById: { not: user.id },
      OR: [{ participantOneId: user.id }, { participantTwoId: user.id }],
    },
    select: { id: true },
  });
  if (!conversation) return;
  await prisma.directConversation.update({ where: { id: conversation.id }, data: { status: "ACCEPTED" } });
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
}

export async function removeSharedMessageAction(messageId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, senderId: user.id, kind: { in: ["SONG", "STATUS"] } },
    select: { id: true, conversationId: true },
  });
  if (!message) return;
  await prisma.directMessage.delete({ where: { id: message.id } });
  revalidatePath(`/messages/${message.conversationId}`);
  revalidatePath("/messages");
}

export async function editSharedMessageAction(messageId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, senderId: user.id, kind: { in: ["SONG", "STATUS"] } },
    select: { id: true, conversationId: true, kind: true },
  });
  if (!message) return;
  const title = String(formData.get("songTitle") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 240 || (message.kind === "SONG" && (!title || title.length > 200)) ||
      (message.kind === "STATUS" && !note)) {
    return;
  }
  await prisma.directMessage.update({
    where: { id: message.id },
    data: {
      sharedSongTitle: message.kind === "SONG" ? title : null,
      sharedNote: note || null,
    },
  });
  revalidatePath(`/messages/${message.conversationId}`);
  revalidatePath("/messages");
}

export async function recordPostViewAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const post = await prisma.post.findFirst({
    where: { id: postId, mediaType: MediaType.VIDEO, AND: [visiblePostsWhere(user.id)] },
    select: { id: true, userId: true },
  });
  if (!post || post.userId === user.id) return;
  await prisma.postView.upsert({
    where: { postId_viewerId: { postId: post.id, viewerId: user.id } },
    create: { postId: post.id, viewerId: user.id },
    update: { viewCount: { increment: 1 }, hiddenFromHistory: false },
  });
}

export async function recordVideoWatchDurationAction(postId: string, watchedMs: number) {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(watchedMs) || watchedMs < 1 || watchedMs > 15_000) return;
  const post = await prisma.post.findFirst({
    where: { id: postId, mediaType: MediaType.VIDEO, userId: { not: user.id }, AND: [visiblePostsWhere(user.id)] },
    select: { id: true },
  });
  if (!post) return;
  await prisma.postView.upsert({
    where: { postId_viewerId: { postId: post.id, viewerId: user.id } },
    create: { postId: post.id, viewerId: user.id, watchedMs },
    update: { watchedMs: { increment: watchedMs }, hiddenFromHistory: false },
  });
}

export async function deletePostViewAction(viewId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.postView.updateMany({ where: { id: viewId, viewerId: user.id }, data: { hiddenFromHistory: true } });
  revalidatePath("/watch-history");
}

export async function deleteStoryViewAction(viewId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.storyView.updateMany({ where: { id: viewId, viewerId: user.id }, data: { hiddenFromHistory: true } });
  revalidatePath("/watch-history");
}

export async function deleteActivityLikeAction(likeId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.like.deleteMany({ where: { id: likeId, userId: user.id } });
  revalidatePath("/activity");
  revalidatePath("/");
}

export async function deleteActivityCommentAction(commentId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.comment.deleteMany({ where: { id: commentId, userId: user.id } });
  revalidatePath("/activity");
  revalidatePath("/");
}

export async function deleteActivityReshareAction(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.post.deleteMany({ where: { id: postId, userId: user.id, sharedPostId: { not: null } } });
  revalidatePath("/activity");
  revalidatePath("/");
}

export async function deleteActivityFollowAction(followId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.follow.deleteMany({ where: { id: followId, followerId: user.id } });
  revalidatePath("/activity");
  revalidatePath("/");
}

export async function deleteActivityEventAction(eventId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.userActivity.deleteMany({ where: { id: eventId, userId: user.id } });
  revalidatePath("/activity");
}

export async function updateContentAudienceAction(
  kind: "post" | "story",
  contentId: string,
  formData: FormData,
) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const audience = String(formData.get("audience") ?? "");
  const errorPath = kind === "post" ? `/post/${contentId}` : `/stories/${contentId}`;
  if (!Object.values(ContentAudience).includes(audience as ContentAudience)) {
    redirect(`${errorPath}?error=audience`);
  }
  const usernames = String(formData.get("selectedUsernames") ?? "")
    .split(",")
    .map((name) => name.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  if (audience === ContentAudience.SELECTED && usernames.length === 0) {
    redirect(`${errorPath}?error=audience`);
  }
  const selectedUsers = usernames.length
    ? await prisma.user.findMany({ where: { usernameKey: { in: usernames } }, select: { id: true } })
    : [];
  if (selectedUsers.length !== new Set(usernames).size) {
    redirect(`${errorPath}?error=audience`);
  }

  if (kind === "post") {
    const ownedPost = await prisma.post.findFirst({
      where: { id: contentId, userId: user.id, sharedPostId: null },
      select: { id: true },
    });
    if (!ownedPost) return;
    await prisma.$transaction([
      prisma.post.update({ where: { id: contentId }, data: { audience: audience as ContentAudience } }),
      prisma.postAudience.deleteMany({ where: { postId: contentId } }),
      ...(audience === ContentAudience.SELECTED
        ? [prisma.postAudience.createMany({ data: selectedUsers.map(({ id }) => ({ postId: contentId, userId: id })) })]
        : []),
    ]);
    revalidatePath(`/post/${contentId}`);
    revalidatePath("/reels");
  } else {
    const ownedStory = await prisma.story.findFirst({ where: { id: contentId, userId: user.id }, select: { id: true } });
    if (!ownedStory) return;
    await prisma.$transaction([
      prisma.story.update({ where: { id: contentId }, data: { audience: audience as ContentAudience } }),
      prisma.storyAudience.deleteMany({ where: { storyId: contentId } }),
      ...(audience === ContentAudience.SELECTED
        ? [prisma.storyAudience.createMany({ data: selectedUsers.map(({ id }) => ({ storyId: contentId, userId: id })) })]
        : []),
    ]);
    revalidatePath(`/stories/${contentId}`);
  }
  revalidatePath("/");
  revalidatePath(`/profile/${user.username}`);
}