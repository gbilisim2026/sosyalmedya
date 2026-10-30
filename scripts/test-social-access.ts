import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { usersCanMessageWhere, visiblePostsWhere, visibleStoriesWhere } from "../src/lib/visibility";

const rollbackMarker = "SOCIAL_ACCESS_TEST_ROLLBACK";

async function main() {
  try {
    await prisma.$transaction(async (transaction) => {
      const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
      const createUser = (name: string, isPrivate = false) => transaction.user.create({
        data: {
          username: `${name}_${suffix}`,
          usernameKey: `${name}_${suffix}`.toLowerCase(),
          passwordHash: "integration-test-only",
          isPrivate,
        },
      });
      const [author, privateAuthor, viewer, stranger, closeFriend] = await Promise.all([
        createUser("public"),
        createUser("private", true),
        createUser("viewer"),
        createUser("stranger"),
        createUser("friend"),
      ]);
      await transaction.user.update({
        where: { id: viewer.id },
        data: { avatarUrl: "/media/avatar-test.jpg", avatarScale: 1.8, avatarOffsetX: 35, avatarOffsetY: 62 },
      });
      const avatar = await transaction.user.findUnique({
        where: { id: viewer.id },
        select: { avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true },
      });
      assert.deepEqual(avatar, {
        avatarUrl: "/media/avatar-test.jpg",
        avatarScale: 1.8,
        avatarOffsetX: 35,
        avatarOffsetY: 62,
      }, "avatar URL and crop settings should persist");
      const publicPost = await transaction.post.create({
        data: { userId: author.id, caption: "public", mediaType: "TEXT", category: "technology" },
      });
      const privatePost = await transaction.post.create({
        data: { userId: privateAuthor.id, caption: "private", mediaType: "TEXT" },
      });
      const selectedPost = await transaction.post.create({
        data: {
          userId: privateAuthor.id,
          caption: "selected",
          mediaType: "TEXT",
          audience: "SELECTED",
          audienceUsers: { create: { userId: viewer.id } },
        },
      });
      const postVisible = async (viewerId: string, postId: string) =>
        Boolean(await transaction.post.findFirst({
          where: { id: postId, AND: [visiblePostsWhere(viewerId)] },
          select: { id: true },
        }));

      assert.equal(await postVisible(stranger.id, publicPost.id), true, "public post should be visible");
      assert.equal(await postVisible(stranger.id, privatePost.id), false, "private post should be hidden");
      assert.equal(await postVisible(stranger.id, selectedPost.id), false, "selected audience cannot bypass private-account follow");
      await transaction.follow.create({ data: { followerId: viewer.id, followingId: privateAuthor.id } });
      assert.equal(await postVisible(viewer.id, selectedPost.id), true, "selected follower should be able to view content");
      await transaction.userBlock.create({ data: { blockerId: privateAuthor.id, blockedId: viewer.id } });
      assert.equal(await postVisible(viewer.id, selectedPost.id), false, "blocking should revoke access");
      await transaction.userBlock.deleteMany({ where: { blockerId: privateAuthor.id, blockedId: viewer.id } });

      const privateStory = await transaction.story.create({
        data: {
          userId: privateAuthor.id,
          mediaUrl: "/media/private-test.jpg",
          mediaType: "PHOTO",
          expiresAt: new Date(Date.now() + 60_000),
          audience: "SELECTED",
          caption: "caption with emoji ✨",
          musicTrackId: "12345",
          musicTitle: "Preview track",
          musicArtist: "Preview artist",
          musicArtworkUrl: "https://is1-ssl.mzstatic.com/image.jpg",
          musicPreviewUrl: "https://audio-ssl.itunes.apple.com/preview.mp3",
          musicTrackUrl: "https://music.apple.com/track/12345",
          musicStartSeconds: 5,
          musicDurationSeconds: 20,
          musicLabelStyle: "cover",
          musicLabelPosition: "top",
          musicLabelScale: 2,
          audienceUsers: { create: { userId: viewer.id } },
        },
      });
      const storyVisible = async (viewerId: string, storyId: string) =>
        Boolean(await transaction.story.findFirst({
          where: { id: storyId, AND: [visibleStoriesWhere(viewerId)] },
          select: { id: true },
        }));
      assert.equal(await storyVisible(stranger.id, privateStory.id), false, "private story should be hidden");
      assert.equal(await storyVisible(viewer.id, privateStory.id), true, "selected approved follower should view story");
      assert.equal(privateStory.isArchived, false, "new stories should start active");
      assert.equal(privateStory.caption, "caption with emoji ✨", "story caption should persist");
      assert.equal(privateStory.musicDurationSeconds, 20, "licensed story preview segment should persist");
      assert.equal(privateStory.musicLabelPosition, "top", "story music label placement should persist");
      const expiredStory = await transaction.story.create({
        data: {
          userId: author.id,
          mediaUrl: "/media/expired-test.jpg",
          mediaType: "PHOTO",
          expiresAt: new Date(Date.now() - 60_000),
        },
      });
      await transaction.story.updateMany({
        where: { isArchived: false, expiresAt: { lte: new Date() } },
        data: { isArchived: true },
      });
      assert.equal((await transaction.story.findUnique({ where: { id: expiredStory.id } }))?.isArchived, true, "expired stories should transition to archive state");
      assert.equal(await storyVisible(stranger.id, expiredStory.id), false, "archived stories should never be visible to others");

      await transaction.closeFriend.create({ data: { ownerId: author.id, friendId: closeFriend.id } });
      const closeFriendsPost = await transaction.post.create({
        data: { userId: author.id, caption: "close friends", mediaType: "TEXT", audience: "CLOSE_FRIENDS" },
      });
      assert.equal(await postVisible(closeFriend.id, closeFriendsPost.id), true, "close friends audience should work");
      assert.equal(await postVisible(stranger.id, closeFriendsPost.id), false, "close friends audience should be restricted");

      const followRequest = await transaction.followRequest.create({
        data: { requesterId: stranger.id, targetId: privateAuthor.id },
      });
      await transaction.followRequest.update({ where: { id: followRequest.id }, data: { status: "ACCEPTED" } });
      await transaction.follow.create({ data: { followerId: stranger.id, followingId: privateAuthor.id } });
      assert.equal(await postVisible(stranger.id, privatePost.id), true, "accepted follow should grant access");
      await transaction.follow.delete({ where: { followerId_followingId: { followerId: stranger.id, followingId: privateAuthor.id } } });
      assert.equal(await postVisible(stranger.id, privatePost.id), false, "unfollow should revoke access");

      await transaction.savedPost.upsert({
        where: { userId_postId: { userId: viewer.id, postId: publicPost.id } },
        create: { userId: viewer.id, postId: publicPost.id },
        update: {},
      });
      await transaction.savedPost.upsert({
        where: { userId_postId: { userId: viewer.id, postId: publicPost.id } },
        create: { userId: viewer.id, postId: publicPost.id },
        update: {},
      });
      assert.equal(await transaction.savedPost.count({ where: { userId: viewer.id, postId: publicPost.id } }), 1, "saved posts must be unique");
      await transaction.like.create({ data: { userId: viewer.id, postId: publicPost.id } });
      await transaction.comment.create({ data: { userId: viewer.id, postId: publicPost.id, content: "preserved" } });
      await transaction.post.update({ where: { id: publicPost.id }, data: { isArchived: true } });
      assert.equal(await postVisible(stranger.id, publicPost.id), false, "archived posts should leave public feeds");
      await transaction.post.update({ where: { id: publicPost.id }, data: { isArchived: false, isPinned: true, isFeatured: true } });
      const restored = await transaction.post.findUnique({
        where: { id: publicPost.id },
        include: { _count: { select: { likes: true, comments: true } } },
      });
      assert.equal(restored?._count.likes, 1, "restoring should preserve likes");
      assert.equal(restored?._count.comments, 1, "restoring should preserve comments");
      assert.equal(restored?.isPinned && restored.isFeatured, true, "pinning and featuring should be independently stored");

      const reshare = await transaction.post.create({
        data: { userId: stranger.id, sharedPostId: publicPost.id, mediaType: "TEXT" },
      });
      assert.equal(await postVisible(viewer.id, reshare.id), true, "visible original should permit its reshare");
      await transaction.post.update({ where: { id: publicPost.id }, data: { isArchived: true } });
      assert.equal(await postVisible(viewer.id, reshare.id), false, "archived original should hide its reshare");
      await transaction.post.update({ where: { id: publicPost.id }, data: { isArchived: false } });

      await transaction.storyView.upsert({
        where: { storyId_viewerId: { storyId: privateStory.id, viewerId: viewer.id } },
        create: { storyId: privateStory.id, viewerId: viewer.id },
        update: { viewCount: { increment: 1 } },
      });
      await transaction.storyView.upsert({
        where: { storyId_viewerId: { storyId: privateStory.id, viewerId: viewer.id } },
        create: { storyId: privateStory.id, viewerId: viewer.id },
        update: { viewCount: { increment: 1 } },
      });
      const storyStats = await transaction.storyView.aggregate({
        where: { storyId: privateStory.id },
        _count: { _all: true },
        _sum: { viewCount: true },
      });
      assert.equal(storyStats._count._all, 1, "story viewer count should be unique");
      assert.equal(storyStats._sum.viewCount, 2, "repeat story views should be counted");

      const reel = await transaction.post.create({
        data: { userId: author.id, caption: "reel", mediaType: "VIDEO", mediaUrl: "/media/reel-test.mp4", isReel: true },
      });
      await transaction.postView.upsert({
        where: { postId_viewerId: { postId: reel.id, viewerId: viewer.id } },
        create: { postId: reel.id, viewerId: viewer.id },
        update: { viewCount: { increment: 1 } },
      });
      await transaction.postView.upsert({
        where: { postId_viewerId: { postId: reel.id, viewerId: viewer.id } },
        create: { postId: reel.id, viewerId: viewer.id },
        update: { viewCount: { increment: 1 } },
      });
      const reelStats = await transaction.postView.aggregate({
        where: { postId: reel.id },
        _count: { _all: true },
        _sum: { viewCount: true },
      });
      assert.equal(reelStats._count._all, 1, "reel viewer count should be unique");
      assert.equal(reelStats._sum.viewCount, 2, "repeat reel views should be counted");
      await transaction.postView.update({
        where: { postId_viewerId: { postId: reel.id, viewerId: viewer.id } },
        data: { watchedMs: { increment: 12_000 } },
      });
      assert.equal((await transaction.postView.findUnique({
        where: { postId_viewerId: { postId: reel.id, viewerId: viewer.id } },
        select: { watchedMs: true },
      }))?.watchedMs, 12_000, "watch duration should be stored separately from repeat views");

      const [participantOneId, participantTwoId] = [viewer.id, stranger.id].sort();
      const conversation = await transaction.directConversation.create({
        data: { pairKey: `${participantOneId}:${participantTwoId}`, participantOneId, participantTwoId },
      });
      await transaction.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: viewer.id,
          content: "private message 😀",
          mediaUrl: "/media/dm-test.jpg",
          mediaType: "PHOTO",
        },
      });
      await transaction.notification.create({
        data: { userId: stranger.id, actorId: viewer.id, type: "MESSAGE" },
      });
      const directMessage = await transaction.directMessage.findFirst({ where: { conversationId: conversation.id } });
      assert.equal(directMessage?.content, "private message 😀", "emoji message text should persist");
      assert.equal(directMessage?.mediaUrl, "/media/dm-test.jpg", "direct message photo URL should persist");
      assert.equal(directMessage?.mediaType, "PHOTO", "direct message photo type should persist");
      await transaction.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: viewer.id,
          content: "",
          kind: "SONG",
          sharedSongTitle: "A short song title",
          sharedNote: "For you",
        },
      });
      const songShare = await transaction.directMessage.findFirst({
        where: { conversationId: conversation.id, kind: "SONG" },
      });
      assert.equal(songShare?.sharedSongTitle, "A short song title", "DM song title should be private conversation data");
      assert.equal(songShare?.sharedNote, "For you", "DM song note should persist");
      assert.equal(await transaction.notification.count({ where: { userId: stranger.id, type: "MESSAGE" } }), 1, "message notification should target recipient");
      await transaction.userBlock.create({ data: { blockerId: stranger.id, blockedId: viewer.id } });
      assert.equal(Boolean(await transaction.user.findFirst({
        where: { id: viewer.id, AND: [usersCanMessageWhere(stranger.id)] },
        select: { id: true },
      })), false, "blocked users should not be able to message");

      const preference = await transaction.recommendationPreference.create({
        data: {
          userId: viewer.id,
          personalizedEnabled: false,
          interests: { create: [{ category: "technology" }, { category: "music" }] },
        },
        include: { interests: true },
      });
      assert.equal(preference.personalizedEnabled, false, "recommendations can be disabled persistently");
      assert.equal(preference.interests.length, 2, "selected interest categories should persist");
      await transaction.recommendationFeedback.create({
        data: { userId: viewer.id, feedbackKey: `post:${publicPost.id}`, type: "NOT_INTERESTED_POST", postId: publicPost.id },
      });
      await transaction.recommendationFeedback.create({
        data: { userId: viewer.id, feedbackKey: "category:technology", type: "LESS_CATEGORY", category: "technology" },
      });
      await transaction.suggestedAccountDismissal.create({ data: { userId: viewer.id, targetId: stranger.id } });
      assert.equal(await transaction.recommendationFeedback.count({ where: { userId: viewer.id } }), 2, "recommendation feedback should persist");
      assert.equal(await transaction.suggestedAccountDismissal.count({ where: { userId: viewer.id } }), 1, "dismissed account suggestions should not return");
      await transaction.searchHistory.create({ data: { userId: viewer.id, query: "technology" } });
      assert.equal(await transaction.searchHistory.count({ where: { userId: viewer.id } }), 1, "search history should be stored for personalized discovery");
      await transaction.externalVideo.create({
        data: {
          provider: "YOUTUBE",
          providerId: "abcdefghijk",
          title: "Official embed result",
          creatorName: "Creator",
          creatorUrl: "https://www.youtube.com/channel/channelid",
          embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk",
          sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
          category: "technology",
        },
      });
      assert.equal(await transaction.externalVideo.count({ where: { provider: "YOUTUBE", providerId: "abcdefghijk" } }), 1, "external video IDs should be stored once per provider");
      const licensedVideo = await transaction.externalVideo.create({
        data: {
          provider: "INTERNET_ARCHIVE",
          providerId: "open-licensed-video",
          title: "Open licensed archive video",
          creatorName: "Internet Archive record",
          creatorUrl: "https://archive.org/details/open-licensed-video",
          embedUrl: "https://archive.org/embed/open-licensed-video",
          sourceUrl: "https://archive.org/details/open-licensed-video",
          licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
          licenseName: "CC BY",
        },
      });
      assert.equal(licensedVideo.licenseName, "CC BY", "open video license metadata should persist");
      assert.equal(licensedVideo.licenseUrl, "https://creativecommons.org/licenses/by/4.0/", "license attribution URL should persist");

      throw new Error(rollbackMarker);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackMarker) throw error;
  } finally {
    await prisma.$disconnect();
  }
  console.log("Social access integration checks passed; all test data was rolled back.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
