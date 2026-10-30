import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (!conversationId) return Response.json({ error: "Conversation is required." }, { status: 400 });
  const conversation = await prisma.directConversation.findFirst({
    where: { id: conversationId, OR: [{ participantOneId: user.id }, { participantTwoId: user.id }] },
    select: { participantOneId: true, participantTwoId: true },
  });
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const targetId = conversation.participantOneId === user.id ? conversation.participantTwoId : conversation.participantOneId;
  const target = await prisma.user.findFirst({
    where: {
      id: targetId,
      showActivityStatus: true,
      NOT: [
        { blocksCreated: { some: { blockedId: user.id } } },
        { blocksReceived: { some: { blockerId: user.id } } },
      ],
    },
    select: { lastActiveAt: true },
  });
  if (!target) return Response.json({ visible: false }, { headers: { "Cache-Control": "no-store" } });
  const now = Date.now();
  const lastActiveAt = target.lastActiveAt?.getTime() ?? 0;
  return Response.json({
    visible: true,
    online: now - lastActiveAt < 2 * 60_000,
    lastActiveAt: target.lastActiveAt?.toISOString() ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
