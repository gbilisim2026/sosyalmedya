import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { usersCanMessageWhere } from "@/lib/visibility";
import { MessageComposer } from "@/app/messages/[id]/message-composer";
import { MessageImage } from "@/app/messages/[id]/message-image";
import { UserAvatar } from "@/app/user-avatar";
import { PresenceStatus } from "@/app/messages/presence-status";
import { MessageRefresh } from "@/app/messages/message-refresh";
import { respondToMessageRequestAction, removeSharedMessageAction, editSharedMessageAction } from "@/app/actions/social";

export const instant = false;

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id,
      OR: [{ participantOneId: user.id }, { participantTwoId: user.id }],
    },
    include: {
      participantOne: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
      participantTwo: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } },
    },
  });
  if (!conversation) notFound();
  const person = conversation.participantOneId === user.id ? conversation.participantTwo : conversation.participantOne;
  const canMessage = await prisma.user.findFirst({
    where: { id: person.id, AND: [usersCanMessageWhere(user.id)] },
    select: { id: true },
  });
  if (!canMessage) notFound();
  await Promise.all([
    prisma.directMessage.updateMany({
      where: { conversationId: id, senderId: person.id, isRead: false },
      data: { isRead: true },
    }),
    prisma.notification.updateMany({
      where: { userId: user.id, actorId: person.id, type: "MESSAGE", isRead: false },
      data: { isRead: true },
    }),
  ]);
  const messages = await prisma.directMessage.findMany({
    where: { conversationId: id },
    include: { sender: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col px-4 py-5 sm:px-8">
        <MessageRefresh />
        <Link href={`/profile/${encodeURIComponent(person.username)}`} className="rounded-t-2xl border border-[#e1e6df] bg-white p-4 text-sm font-semibold hover:text-[#315b46]">
          <span className="flex items-center gap-3"><UserAvatar {...person} className="size-10" /><span>{person.displayName ?? person.username} · @{person.username}<span className="mt-1 block"><PresenceStatus conversationId={id} /></span></span></span>
        </Link>
        <div className="flex-1 space-y-3 overflow-y-auto border-x border-[#e1e6df] bg-white p-4">
          {conversation.status === "PENDING" && conversation.requestedById !== user.id && <form action={respondToMessageRequestAction.bind(null, id)} className="rounded-xl border border-[#e1e6df] bg-[#f7f9f6] p-3 text-center">
            <p className="text-sm font-semibold">Mesaj isteği</p><p className="mt-1 text-xs text-[#68716b]">Bu sohbete yanıt vermek için isteği kabul et.</p>
            <button className="mt-2 rounded-lg bg-[#203d34] px-4 py-2 text-xs font-semibold text-white">İsteği kabul et</button>
          </form>}
          {messages.map((message) => <div key={message.id} className={`flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.senderId === user.id ? "bg-[#203d34] text-white" : "bg-[#edf4e9]"}`}>
              {message.mediaUrl && <MessageImage src={message.mediaUrl} />}
              {message.kind === "SONG" && <div className="text-sm"><p className="font-semibold">♫ {message.sharedSongTitle}</p>{message.sharedNote && <p className="mt-1 whitespace-pre-wrap break-words text-xs opacity-80">{message.sharedNote}</p>}</div>}
              {message.kind === "STATUS" && message.sharedNote && <div className="text-sm"><p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Durum</p><p className="mt-1 whitespace-pre-wrap break-words">{message.sharedNote}</p></div>}
              {message.kind === "TEXT" && message.content && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>}
              <time className={`mt-1 block text-right text-[10px] ${message.senderId === user.id ? "text-white/65" : "text-[#788179]"}`}>{message.createdAt.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</time>
              {message.senderId === user.id && message.kind !== "TEXT" && <form action={removeSharedMessageAction.bind(null, message.id)} className="mt-1 text-right"><button className="text-[10px] underline">Paylaşımı kaldır</button></form>}
              {message.senderId === user.id && message.kind !== "TEXT" && <details className="mt-1 text-right">
                <summary className="cursor-pointer text-[10px] underline">Düzenle</summary>
                <form action={editSharedMessageAction.bind(null, message.id)} className="mt-2 space-y-2 text-left">
                  {message.kind === "SONG" && <input name="songTitle" required maxLength={200} defaultValue={message.sharedSongTitle ?? ""} aria-label="Şarkı adı" className="w-full rounded-md border border-[#dce2dc] px-2 py-1 text-xs text-[#202522]" />}
                  <textarea name="note" maxLength={240} defaultValue={message.sharedNote ?? ""} aria-label="Kısa not" className="w-full rounded-md border border-[#dce2dc] px-2 py-1 text-xs text-[#202522]" />
                  <button className="rounded-md border border-[#dce2dc] px-2 py-1 text-[10px] font-semibold">Kaydet</button>
                </form>
              </details>}
            </div>
          </div>)}
          {messages.length === 0 && <p className="pt-10 text-center text-sm text-[#788179]">Sohbeti başlatmak için mesaj gönder.</p>}
        </div>
        {(conversation.status === "ACCEPTED" || conversation.requestedById === user.id) && <MessageComposer conversationId={id} />}
      </section>
    </main>
  );
}
