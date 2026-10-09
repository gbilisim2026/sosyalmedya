import Link from "next/link";
import { Bell, Check, CircleCheck, UserPlus, X } from "lucide-react";
import {
  acceptFollowRequestAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  rejectFollowRequestAction,
} from "@/app/actions/social";
import { NotificationType } from "@/generated/prisma/enums";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const instant = false;

function notificationMessage(type: NotificationType) {
  switch (type) {
    case NotificationType.FOLLOW:
      return "seni takip etmeye başladı.";
    case NotificationType.FOLLOW_REQUEST_ACCEPTED:
      return "takip isteğini kabul etti.";
    case NotificationType.FOLLOW_REQUEST_REJECTED:
      return "takip isteğini reddetti.";
    case NotificationType.LIKE:
      return "gönderini beğendi.";
    case NotificationType.COMMENT:
      return "gönderine yorum yaptı.";
    case NotificationType.COMMENT_REPLY:
      return "yorumuna yanıt verdi.";
    case NotificationType.FOLLOW_REQUEST:
      return "sana takip isteği gönderdi.";
  }
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [requests, notifications] = await Promise.all([
    prisma.followRequest.findMany({
      where: { targetId: user.id, status: "PENDING" },
      include: { requester: { select: { username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id, type: { not: NotificationType.FOLLOW_REQUEST } },
      include: { actor: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#64806f]">Hesabındaki yenilikler</p>
            <h1 className="mt-1 text-2xl font-semibold">Bildirimler</h1>
          </div>
          {unreadCount > 0 && <form action={markAllNotificationsReadAction}>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce2dc] bg-white px-3 text-xs font-semibold text-[#315b46] hover:bg-[#edf4e9]">
              <Check size={15} /> Tümünü okundu işaretle
            </button>
          </form>}
        </div>

        <section className="mt-7">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><UserPlus size={17} /> Takip istekleri</h2>
          {requests.length ? <div className="mt-3 divide-y divide-[#edf0eb] rounded-2xl border border-[#e1e6df] bg-white px-4">
            {requests.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-3 py-4">
              <Link href={`/profile/${encodeURIComponent(request.requester.username)}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e9efe7] font-semibold text-[#315b46]">
                {(request.requester.displayName ?? request.requester.username).slice(0, 1).toUpperCase()}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm"><Link href={`/profile/${encodeURIComponent(request.requester.username)}`} className="font-semibold hover:underline">@{request.requester.username}</Link> seni takip etmek istiyor.</p>
                <time className="text-xs text-[#788179]">{request.createdAt.toLocaleDateString("tr-TR")}</time>
              </div>
              <form action={acceptFollowRequestAction.bind(null, request.id)}>
                <button aria-label="Takip isteğini kabul et" title="Kabul et" className="grid size-9 place-items-center rounded-lg bg-[#203d34] text-white hover:bg-[#2c5145]"><CircleCheck size={17} /></button>
              </form>
              <form action={rejectFollowRequestAction.bind(null, request.id)}>
                <button aria-label="Takip isteğini reddet" title="Reddet" className="grid size-9 place-items-center rounded-lg border border-[#e1e6df] text-[#7c453d] hover:bg-[#fff0ed]"><X size={17} /></button>
              </form>
            </div>)}
          </div> : <p className="mt-3 rounded-xl border border-dashed border-[#d5ddd4] px-5 py-7 text-sm text-[#788179]">Bekleyen takip isteğin yok.</p>}
        </section>

        <section className="mt-9">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Bell size={17} /> Son aktiviteler</h2>
          {notifications.length ? <div className="mt-3 divide-y divide-[#edf0eb] rounded-2xl border border-[#e1e6df] bg-white px-4">
            {notifications.map((notification) => <div key={notification.id} className={`flex items-center gap-3 py-4 ${notification.isRead ? "" : "-mx-4 border-l-[3px] border-[#e36650] bg-[#fffaf6] px-4"}`}>
              <Link href={`/profile/${encodeURIComponent(notification.actor.username)}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9efe7] font-semibold text-[#315b46]">
                {(notification.actor.displayName ?? notification.actor.username).slice(0, 1).toUpperCase()}
              </Link>
              <p className="min-w-0 flex-1 text-sm">
                <Link href={`/profile/${encodeURIComponent(notification.actor.username)}`} className="font-semibold hover:underline">@{notification.actor.username}</Link>{" "}
                {notificationMessage(notification.type)}
                <time className="mt-1 block text-xs text-[#788179]">{notification.createdAt.toLocaleDateString("tr-TR")}</time>
              </p>
              {!notification.isRead && <form action={markNotificationReadAction.bind(null, notification.id)}>
                <button aria-label="Okundu işaretle" title="Okundu işaretle" className="grid size-9 place-items-center rounded-lg text-[#557260] hover:bg-[#edf4e9]"><Check size={17} /></button>
              </form>}
            </div>)}
          </div> : <p className="mt-3 rounded-xl border border-dashed border-[#d5ddd4] px-5 py-7 text-sm text-[#788179]">Henüz bildirim yok.</p>}
        </section>
      </section>
    </main>
  );
}