import { getRecommendedPosts } from "@/lib/recommendations";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json(
      { error: "Oturum açman gerekiyor." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const posts = await getRecommendedPosts(currentUser.id, 20);
  const postIds = posts.map((post) => post.id);
  const [likedPosts, savedPosts] = await Promise.all([
    prisma.like.findMany({
      where: { userId: currentUser.id, postId: { in: postIds } },
      select: { postId: true },
    }),
    prisma.savedPost.findMany({
      where: { userId: currentUser.id, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);
  const likedIds = new Set(likedPosts.map(({ postId }) => postId));
  const savedIds = new Set(savedPosts.map(({ postId }) => postId));

  return Response.json(
    {
      posts: posts.map((post) => ({
        id: post.id,
        caption: post.caption,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        mediaItems: post.mediaItems.map((item) => ({ mediaUrl: item.mediaUrl })),
        visualEffect: post.visualEffect,
        location: post.location,
        createdAt: post.createdAt,
        user: post.user,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        likedByCurrentUser: likedIds.has(post.id),
        isSaved: savedIds.has(post.id),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
