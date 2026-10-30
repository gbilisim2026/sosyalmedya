import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Oturum açman gerekiyor." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (query.length < 2) return Response.json({ users: [] });
  const normalized = query.toLowerCase();
  const page = Math.min(20, Math.max(0, Number(new URL(request.url).searchParams.get("page") ?? 0) || 0));
  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      NOT: [
        { blocksCreated: { some: { blockedId: user.id } } },
        { blocksReceived: { some: { blockerId: user.id } } },
      ],
      OR: [
        { usernameKey: { startsWith: normalized } },
        { displayName: { startsWith: query } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      avatarScale: true,
      avatarOffsetX: true,
      avatarOffsetY: true,
    },
    skip: page * 20,
    take: 21,
    orderBy: [{ usernameKey: "asc" }],
  });
  const pairKeys = users.map((person) => [user.id, person.id].sort().join(":"));
  const conversations = await prisma.directConversation.findMany({
    where: { pairKey: { in: pairKeys } },
    select: { pairKey: true },
  });
  const chatted = new Set(conversations.map(({ pairKey }) => pairKey));
  return Response.json({
    users: users.slice(0, 20).map((person) => ({
      ...person,
      hasConversation: chatted.has([user.id, person.id].sort().join(":")),
    })),
    hasMore: users.length > 20,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
