import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/app/user-avatar";
import { MessageSearch } from "@/app/messages/message-search";
import { MessageRefresh } from "@/app/messages/message-refresh";

export const instant = false;

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [
        { participantOneId: user.id, participantTwo: { NOT: [{ blocksCreated: { some: { blockedId: user.id } } }, { blocksReceived: { some: { blockerId: user.id } } }] } },
        { participantTwoId: user.id, participantOne: { NOT: [{ blocksCreated: { some: { blockedId: user.id } } }, { blocksReceived: { some: { blockerId: user.id } } }] } },
      ],
    },
    include: {
      participantOne: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      participantTwo: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unreadByConversation = await prisma.directMessage.groupBy({
    by: ["conversationId"],
    where: { conversationId: { in: conversations.map(({ id }) => id) }, senderId: { not: user.id }, isRead: false },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadByConversation.map((row) => [row.conversationId, row._count._all]));
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <MessageRefresh />
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><MessageCircle size={22} /> Mesajlar</h1>
        <MessageSearch />
        <div className="mt-5 divide-y divide-[#edf0eb] rounded-2xl border border-[#e1e6df] bg-white px-4">
          {conversations.map((conversation) => {
            const person = conversation.participantOneId === user.id ? conversation.participantTwo : conversation.participantOne;
            const latest = conversation.messages[0];
            return <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex items-center gap-3 py-4 hover:text-[#315b46]">
              <UserAvatar {...person} className="size-11" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">@{person.username}</span>
                <span className="block truncate text-xs text-[#788179]">{conversation.status === "PENDING" && conversation.requestedById !== user.id ? "Yeni mesaj isteği" : latest?.kind === "SONG" ? `♫ ${latest.sharedSongTitle}` : latest?.kind === "STATUS" ? `Durum: ${latest.sharedNote}` : latest?.content || (latest?.mediaUrl ? "📷 Fotoğraf" : "Henüz mesaj yok")}</span>
              </span>
              {unreadMap.get(conversation.id) ? <span className="grid size-6 place-items-center rounded-full bg-[#e36650] text-xs font-bold text-white">{unreadMap.get(conversation.id)}</span> : null}
            </Link>;
          })}
          {conversations.length === 0 && <p className="py-12 text-center text-sm text-[#788179]">Henüz sohbetin yok. Bir profilden mesaj başlatabilirsin.</p>}
        </div>
      </section>
    </main>
  );
}
