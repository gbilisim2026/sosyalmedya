import type { Prisma } from "@/generated/prisma/client";

export function visiblePostsWhere(viewerId: string): Prisma.PostWhereInput {
  const audienceEligible: Prisma.PostWhereInput = {
    OR: [
      { visibility: "PUBLIC", user: { isPrivate: false } },
      { user: { followers: { some: { followerId: viewerId } } } },
    ],
  };
  const follower: Prisma.PostWhereInput = {
    user: { followers: { some: { followerId: viewerId } } },
  };
  const audienceRules: Prisma.PostWhereInput[] = [
    { AND: [audienceEligible, { audience: "EVERYONE" }] },
    { AND: [follower, { audience: "FOLLOWERS" }] },
    { AND: [audienceEligible, { user: { closeFriendsAsOwner: { some: { friendId: viewerId } } } }, { audience: "CLOSE_FRIENDS" }] },
    { AND: [audienceEligible, { audienceUsers: { some: { userId: viewerId } } }, { audience: "SELECTED" }] },
  ];

  const normalPostRules = audienceRules.map((rule) => ({ AND: [{ sharedPostId: null }, rule] }));
  const shareOwnerEligible: Prisma.PostWhereInput = {
    OR: [
      { user: { isPrivate: false }, visibility: "PUBLIC", audience: "EVERYONE" },
      {
        user: { followers: { some: { followerId: viewerId } } },
        audience: { in: ["EVERYONE", "FOLLOWERS"] },
      },
    ],
  };
  const sharedPostRules: Prisma.PostWhereInput[] = [
    {
      AND: [
        shareOwnerEligible,
        { sharedPost: { is: { isArchived: false, OR: audienceRules } } },
      ],
    },
  ];

  return {
    isArchived: false,
    NOT: [
      { user: { blocksCreated: { some: { blockedId: viewerId } } } },
      { user: { blocksReceived: { some: { blockerId: viewerId } } } },
      { sharedPost: { is: { user: { blocksCreated: { some: { blockedId: viewerId } } } } } },
      { sharedPost: { is: { user: { blocksReceived: { some: { blockerId: viewerId } } } } } },
    ],
    OR: [
      { userId: viewerId, sharedPostId: null },
      ...normalPostRules,
      ...sharedPostRules,
    ],
  };
}

export function visibleStoriesWhere(viewerId: string): Prisma.StoryWhereInput {
  const audienceEligible: Prisma.StoryWhereInput = {
    OR: [
      { user: { isPrivate: false } },
      { user: { followers: { some: { followerId: viewerId } } } },
    ],
  };
  const follower: Prisma.StoryWhereInput = {
    user: { followers: { some: { followerId: viewerId } } },
  };
  return {
    AND: [
      {
        OR: [
          { sharedStoryId: null },
          {
            sharedStory: {
              is: {
                isArchived: false,
                expiresAt: { gt: new Date() },
                audience: "EVERYONE",
                user: { isPrivate: false },
                NOT: [
                  { user: { blocksCreated: { some: { blockedId: viewerId } } } },
                  { user: { blocksReceived: { some: { blockerId: viewerId } } } },
                ],
              },
            },
          },
        ],
      },
    ],
    NOT: [
      { user: { blocksCreated: { some: { blockedId: viewerId } } } },
      { user: { blocksReceived: { some: { blockerId: viewerId } } } },
    ],
    OR: [
      { userId: viewerId },
      {
        isArchived: false,
        OR: [
          { AND: [audienceEligible, { audience: "EVERYONE" }] },
          { AND: [follower, { audience: "FOLLOWERS" }] },
          { AND: [audienceEligible, { user: { closeFriendsAsOwner: { some: { friendId: viewerId } } } }, { audience: "CLOSE_FRIENDS" }] },
          { AND: [audienceEligible, { audienceUsers: { some: { userId: viewerId } } }, { audience: "SELECTED" }] },
        ],
      },
    ],
  };
}

export function usersCanMessageWhere(userId: string): Prisma.UserWhereInput {
  return {
    NOT: [
      { blocksCreated: { some: { blockedId: userId } } },
      { blocksReceived: { some: { blockerId: userId } } },
    ],
  };
}
