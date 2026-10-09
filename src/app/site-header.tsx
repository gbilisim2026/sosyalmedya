import Link from "next/link";
import { Bell, CirclePlus, CircleUserRound, Clapperboard, Home, Search } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

type SiteHeaderProps = { username: string };

const navItems = [
  { href: "/", label: "Ana sayfa", Icon: Home },
  { href: "/search", label: "Ara", Icon: Search },
  { href: "/create", label: "Gönderi", Icon: CirclePlus },
  { href: "/reels", label: "Reels", Icon: Clapperboard },
  { href: "/stories/create", label: "Hikâye", Icon: CirclePlus },
  { href: "/notifications", label: "Bildirimler", Icon: Bell },
];

export async function SiteHeader({ username }: SiteHeaderProps) {
  const unreadCount = await prisma.notification.count({
    where: { user: { usernameKey: username.toLowerCase() }, isRead: false },
  });

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[#e1e6df] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Gültepe <span className="text-[#e36650]">Sosyal Medya</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#526058] transition hover:bg-[#f1f4ef] hover:text-[#203d34]"
              >
                <span className="relative"><Icon size={17} />{label === "Bildirimler" && unreadCount > 0 && <span className="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#e36650] px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</span> {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${encodeURIComponent(username)}`}
              className="hidden items-center gap-2 text-sm font-medium sm:inline-flex"
            >
              <CircleUserRound size={18} /> @{username}
            </Link>
            <form action={logoutAction}>
              <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold text-[#526058] hover:bg-[#f4f6f2]">
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-[#e1e6df] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[
          ...navItems.slice(0, 2),
          navItems[2],
          { href: "/reels", label: "Reels", Icon: Clapperboard },
          { href: "/notifications", label: "Bildirimler", Icon: Bell },
          { href: `/profile/${encodeURIComponent(username)}`, label: "Profil", Icon: CircleUserRound },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-label={label} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[#526058]">
            <span className="relative"><Icon size={20} />{label === "Bildirimler" && unreadCount > 0 && <span className="absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#e36650] px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}