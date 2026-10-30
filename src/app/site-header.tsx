import Link from "next/link";
import { ChevronDown, Settings } from "lucide-react";
import { logoutAction, switchAccountAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/app/user-avatar";
import { SiteNavigation } from "@/app/site-navigation";

type SiteHeaderProps = { username: string };

export async function SiteHeader({ username }: SiteHeaderProps) {
  const [unreadCount, currentUser, savedAccounts] = await Promise.all([
    prisma.notification.count({ where: { user: { usernameKey: username.toLowerCase() }, isRead: false } }),
    prisma.user.findUnique({
      where: { usernameKey: username.toLowerCase() },
      select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true },
    }),
    prisma.savedAccount.findMany({
      where: { owner: { usernameKey: username.toLowerCase() } },
      include: { account: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarScale: true, avatarOffsetX: true, avatarOffsetY: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const unreadMessages = currentUser ? await prisma.directMessage.count({
    where: {
      senderId: { not: currentUser.id },
      isRead: false,
      conversation: {
        OR: [{ participantOneId: currentUser.id }, { participantTwoId: currentUser.id }],
      },
    },
  }) : 0;

  return (
    <>
      <SiteNavigation username={username} unreadCount={unreadCount} unreadMessages={unreadMessages} />
      <div className="mobile-account-panel">
        <details className="group relative">
          <summary className="mobile-account-summary" aria-label="Hesap menüsü">
            {currentUser ? <UserAvatar {...currentUser} className="size-8" /> : <span className="size-8 rounded-full bg-[#edf4e9]" />}
          </summary>
          <div className="mobile-account-menu">
            <Link href={`/profile/${encodeURIComponent(username)}`} className="account-menu-link">Profili görüntüle</Link>
            {savedAccounts.map(({ account }) => <form key={account.id} action={switchAccountAction.bind(null, account.id)}>
              <button className="account-menu-link flex w-full items-center gap-2 text-left"><UserAvatar {...account} className="size-8" />@{account.username}</button>
            </form>)}
            <Link href="/settings" className="account-menu-link flex items-center gap-2 text-xs"><Settings size={14} /> Ayarlar</Link>
            <form action={logoutAction} className="border-t border-[#edf0eb] pt-1">
              <button className="account-menu-link w-full text-left text-xs text-[#b34e3d]">Çıkış yap</button>
            </form>
          </div>
        </details>
      </div>
      <div className="site-account-panel">
        <details className="group relative">
          <summary className="site-account-summary">
            {currentUser ? <UserAvatar {...currentUser} className="size-9 shrink-0" /> : <span className="size-9 rounded-full bg-[#edf4e9]" />}
            <span className="site-nav-label min-w-0 flex-1 truncate text-left"><strong className="block truncate text-sm">@{username}</strong><span className="block truncate text-xs text-[#788179]">{currentUser?.displayName ?? "Hesap menüsü"}</span></span>
            <ChevronDown size={16} className="site-nav-label" />
          </summary>
          <div className="site-account-menu">
            <Link href={`/profile/${encodeURIComponent(username)}`} className="account-menu-link">Profili görüntüle</Link>
            {savedAccounts.map(({ account }) => <form key={account.id} action={switchAccountAction.bind(null, account.id)}>
              <button className="account-menu-link flex w-full items-center gap-2 text-left"><UserAvatar {...account} className="size-8" />@{account.username}</button>
            </form>)}
            <Link href="/settings#accounts" className="account-menu-link text-xs">Hesap ekle / yönet</Link>
            <Link href="/settings" className="account-menu-link flex items-center gap-2 text-xs"><Settings size={14} /> Ayarlar</Link>
            <form action={logoutAction} className="border-t border-[#edf0eb] pt-1">
              <button className="account-menu-link w-full text-left text-xs text-[#b34e3d]">Çıkış yap</button>
            </form>
          </div>
        </details>
      </div>
    </>
  );
}
