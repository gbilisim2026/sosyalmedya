import { prisma } from "@/lib/prisma";
import { visiblePostsWhere } from "@/lib/visibility";

export async function getSuggestedPeople(viewerId: string, contextUserId: string, limit = 6) {
  const [following, contextFollowers, blocked, dismissed] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true }, take: 500 }),
    prisma.follow.findMany({ where: { followingId: contextUserId }, select: { followerId: true }, take: 500 }),
    prisma.userBlock.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.suggestedAccountDismissal.findMany({ where: { userId: viewerId }, select: { targetId: true } }),
  ]);
  const followingIds = new Set(following.map(({ followingId }) => followingId));
  const excludedIds = new Set([
    viewerId,
    contextUserId,
    ...followingIds,
    ...dismissed.map(({ targetId }) => targetId),
    ...blocked.flatMap(({ blockerId, blockedId }) => [blockerId, blockedId]),
  ]);
  const relatedIds = [...new Set([...followingIds, ...contextFollowers.map(({ followerId }) => followerId)])];
  const candidateEdges = relatedIds.length
    ? await prisma.follow.findMany({
        where: { followerId: { in: relatedIds }, followingId: { notIn: [...excludedIds] } },
        select: { followingId: true, followerId: true },
        take: 2000,
      })
    : [];
  const scores = new Map<string, number>();
  const profileFollowers = new Set(contextFollowers.map(({ followerId }) => followerId));
  for (const edge of candidateEdges) {
    scores.set(edge.followingId, (scores.get(edge.followingId) ?? 0) + (profileFollowers.has(edge.followerId) ? 3 : 1));
  }
  const rankedIds = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 3).map(([id]) => id);
  const users = rankedIds.length
    ? await prisma.user.findMany({
        where: { id: { in: rankedIds }, isPrivate: false },
        select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true, _count: { select: { followers: true } } },
      })
    : [];
  const scoreById = new Map(rankedIds.map((id) => [id, scores.get(id) ?? 0]));
  return users.sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0)).slice(0, limit);
}

export async function getRecommendedPosts(viewerId: string, limit = 40, category: string | null = null, offset = 0) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [preference, signals, viewed, saved, reshares, followed, feedback, searches] = await Promise.all([
    prisma.recommendationPreference.findUnique({
      where: { userId: viewerId },
      include: { interests: { select: { category: true } } },
    }),
    Promise.all([
      prisma.like.findMany({
        where: { userId: viewerId, createdAt: { gte: since } },
        select: { post: { select: { id: true, userId: true, category: true, hashtags: { select: { hashtag: { select: { tagKey: true } } } } } } },
        take: 100,
      }),
      prisma.comment.findMany({
        where: { userId: viewerId, createdAt: { gte: since } },
        select: { post: { select: { id: true, userId: true, category: true, hashtags: { select: { hashtag: { select: { tagKey: true } } } } } } },
        take: 100,
      }),
      prisma.postView.findMany({
        where: { viewerId, hiddenFromHistory: false, createdAt: { gte: since } },
        select: { watchedMs: true, viewCount: true, post: { select: { id: true, userId: true, category: true, hashtags: { select: { hashtag: { select: { tagKey: true } } } } } } },
        take: 100,
      }),
    ]),
    prisma.postView.findMany({ where: { viewerId, hiddenFromHistory: false, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }, select: { postId: true }, take: 300 }),
    prisma.savedPost.findMany({
      where: { userId: viewerId, createdAt: { gte: since } },
      select: { post: { select: { userId: true, category: true, hashtags: { select: { hashtag: { select: { tagKey: true } } } } } } },
      take: 100,
    }),
    prisma.post.findMany({
      where: { userId: viewerId, sharedPostId: { not: null }, createdAt: { gte: since } },
      select: { sharedPost: { select: { userId: true, category: true, hashtags: { select: { hashtag: { select: { tagKey: true } } } } } } },
      take: 100,
    }),
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true }, take: 500 }),
    prisma.recommendationFeedback.findMany({
      where: { userId: viewerId },
      select: { type: true, postId: true, targetUserId: true, category: true },
      take: 500,
    }),
    prisma.searchHistory.findMany({ where: { userId: viewerId, createdAt: { gte: since } }, select: { query: true }, take: 100 }),
  ]);
  const authorScores = new Map<string, number>();
  const tagScores = new Map<string, number>();
  const categoryScores = new Map<string, number>();
  const personalizedEnabled = preference?.personalizedEnabled ?? true;
  for (const [index, records] of signals.entries()) {
    for (const record of records) {
      const post = record.post;
      const watchWeight = "watchedMs" in record
        ? 1 + Math.min(record.watchedMs / 20_000, 5) + Math.max(0, record.viewCount - 1) * 0.75
        : 1;
      const weight = ([3, 4, 2][index] ?? 1) * watchWeight;
      if (!personalizedEnabled) continue;
      authorScores.set(post.userId, (authorScores.get(post.userId) ?? 0) + weight);
      if (post.category) categoryScores.set(post.category, (categoryScores.get(post.category) ?? 0) + weight);
      for (const { hashtag } of post.hashtags) tagScores.set(hashtag.tagKey, (tagScores.get(hashtag.tagKey) ?? 0) + weight);
    }
  }
  if (personalizedEnabled) {
    for (const { post } of saved) {
      authorScores.set(post.userId, (authorScores.get(post.userId) ?? 0) + 5);
      if (post.category) categoryScores.set(post.category, (categoryScores.get(post.category) ?? 0) + 5);
      for (const { hashtag } of post.hashtags) tagScores.set(hashtag.tagKey, (tagScores.get(hashtag.tagKey) ?? 0) + 5);
    }
    for (const { sharedPost: post } of reshares) {
      if (!post) continue;
      authorScores.set(post.userId, (authorScores.get(post.userId) ?? 0) + 4);
      if (post.category) categoryScores.set(post.category, (categoryScores.get(post.category) ?? 0) + 4);
      for (const { hashtag } of post.hashtags) tagScores.set(hashtag.tagKey, (tagScores.get(hashtag.tagKey) ?? 0) + 4);
    }
    for (const { followingId } of followed) authorScores.set(followingId, (authorScores.get(followingId) ?? 0) + 2);
    for (const { category: interest } of preference?.interests ?? []) {
      categoryScores.set(interest, (categoryScores.get(interest) ?? 0) + 8);
    }
    for (const { query } of searches) {
      const term = query.toLowerCase().replace(/^#/, "");
      for (const [tag, score] of tagScores) {
        if (tag.includes(term) || term.includes(tag)) tagScores.set(tag, score + 1);
      }
    }
  }
  const ignoredPostIds = feedback.flatMap(({ type, postId }) => type === "NOT_INTERESTED_POST" && postId ? [postId] : []);
  const excludedPostIds = [...new Set([...viewed.map(({ postId }) => postId), ...ignoredPostIds])];
  const hiddenAuthorIds = feedback.flatMap(({ type, targetUserId }) => type === "HIDE_ACCOUNT" && targetUserId ? [targetUserId] : []);
  const suppressedCategories = feedback.flatMap(({ type, category: value }) => type === "LESS_CATEGORY" && value ? [value] : []);
  const candidates = await prisma.post.findMany({
    where: {
      createdAt: { gte: since },
      ...(excludedPostIds.length ? { id: { notIn: excludedPostIds } } : {}),
      ...(hiddenAuthorIds.length ? { userId: { notIn: hiddenAuthorIds } } : {}),
      ...(suppressedCategories.length ? { category: { notIn: suppressedCategories } } : {}),
      ...(category ? { category } : {}),
      AND: [visiblePostsWhere(viewerId)],
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      hashtags: { include: { hashtag: { select: { tagKey: true, name: true } } } },
      recommendationFeedback: {
        where: { userId: viewerId },
        select: { type: true },
      },
      _count: { select: { likes: true, comments: true } },
      sharedPost: { include: { user: { select: { username: true } } } },
      likes: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } } },
      },
      comments: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, gifUrl: true, gifLicense: true, gifAttributionUrl: true, user: { select: { username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 160,
  });
  const now = Date.now();
  const ranked = candidates.map((post) => {
    const ageHours = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
    const affinity = personalizedEnabled
      ? (authorScores.get(post.userId) ?? 0) * 2 +
        (categoryScores.get(post.category ?? "") ?? 0) * 2 +
        post.hashtags.reduce((sum, { hashtag }) => sum + (tagScores.get(hashtag.tagKey) ?? 0) * 3, 0)
      : 0;
    const engagement = Math.log1p(post._count.likes * 2 + post._count.comments * 3);
    const freshness = Math.max(0, 10 - ageHours / 24);
    const followedAuthorBoost = personalizedEnabled && followed.some(({ followingId }) => followingId === post.userId) ? 4 : 0;
    return { post, score: affinity + followedAuthorBoost + engagement + freshness };
  }).sort((a, b) => b.score - a.score);
  const authorCounts = new Map<string, number>();
  const selected: typeof ranked = [];
  for (const item of ranked) {
    const count = authorCounts.get(item.post.userId) ?? 0;
    if (count >= 2) continue;
    selected.push(item);
    authorCounts.set(item.post.userId, count + 1);
    if (selected.length >= limit + offset) break;
  }
  return selected.slice(offset, offset + limit).map(({ post }) => post);
}
