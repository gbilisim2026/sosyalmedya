import type { Prisma } from "@/generated/prisma/client";

export function visiblePostsWhere(viewerId: string): Prisma.PostWhereInput {
  return {
    OR: [
      { userId: viewerId },
      { AND: [{ visibility: "PUBLIC" }, { user: { isPrivate: false } }] },
      { user: { followers: { some: { followerId: viewerId } } } },
    ],
  };
}