"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Clapperboard, Compass, Home, MessageCircle, PlusSquare, Search, Settings, UserRound } from "lucide-react";
import { BrandLogo } from "@/app/brand-logo";

type Props = { username: string; unreadCount: number; unreadMessages: number };

const links = [
  { href: "/", label: "Ana sayfa", Icon: Home },
  { href: "/search", label: "Ara", Icon: Search },
  { href: "/explore", label: "Keşfet", Icon: Compass },
  { href: "/create", label: "Oluştur", Icon: PlusSquare },
  { href: "/reels", label: "Reels", Icon: Clapperboard },
  { href: "/messages", label: "Mesajlar", Icon: MessageCircle, badge: "messages" },
  { href: "/notifications", label: "Bildirimler", Icon: Bell, badge: "notifications" },
];

export function SiteNavigation({ username, unreadCount, unreadMessages }: Props) {
  const pathname = usePathname();
  const profileHref = `/profile/${encodeURIComponent(username)}`;
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (href: string) => `app-nav-link ${isActive(href) ? "app-nav-link-active" : ""}`;
  const profileActive = pathname.startsWith("/profile/");

  return (
    <>
      <aside className="site-sidebar" aria-label="Ana gezinme">
        <BrandLogo className="site-brand" imageSize={44} />
        <nav className="site-sidebar-links">
          {links.map(({ href, label, Icon, badge }) => {
            const count = badge === "messages" ? unreadMessages : unreadCount;
            return (
              <Link key={href} href={href} className={linkClass(href)} aria-current={isActive(href) ? "page" : undefined}>
                <span className="relative"><Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />{count > 0 && <span className="nav-badge">{count > 99 ? "99+" : count}</span>}</span>
                <span className="site-nav-label">{label}</span>
              </Link>
            );
          })}
          <Link href={profileHref} className={linkClass(profileHref)} aria-current={profileActive ? "page" : undefined}>
            <UserRound size={22} strokeWidth={profileActive ? 2.5 : 1.8} />
            <span className="site-nav-label">Profil</span>
          </Link>
        </nav>
        <Link href="/settings" className={`site-settings-link ${isActive("/settings") ? "app-nav-link-active" : ""}`}>
          <Settings size={19} /> <span className="site-nav-label">Ayarlar</span>
        </Link>
      </aside>
      <header className="mobile-topbar">
        <BrandLogo className="site-brand" imageSize={44} />
        <div className="flex items-center gap-1">
          <Link href="/notifications" aria-label="Bildirimler" className="mobile-topbar-icon"><Bell size={21} />{unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>
          <Link href="/messages" aria-label="Mesajlar" className="mobile-topbar-icon"><MessageCircle size={21} />{unreadMessages > 0 && <span className="nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</Link>
        </div>
      </header>
      <nav aria-label="Mobil gezinme" className="mobile-bottom-nav">
        {[
          { href: "/", label: "Ana sayfa", Icon: Home },
          { href: "/explore", label: "Keşfet", Icon: Compass },
          { href: "/create", label: "Oluştur", Icon: PlusSquare },
          { href: "/reels", label: "Reels", Icon: Clapperboard },
          { href: "/notifications", label: "Bildirimler", Icon: Bell },
          { href: profileHref, label: "Profil", Icon: UserRound },
        ].map(({ href, label, Icon }) => {
          const active = isActive(href);
          const count = href === "/notifications" ? unreadCount : 0;
          return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`mobile-nav-item ${active ? "mobile-nav-item-active" : ""}`}><span className="relative"><Icon size={22} strokeWidth={active ? 2.5 : 1.8} />{count > 0 && <span className="nav-badge">{count > 99 ? "99+" : count}</span>}</span><span>{label}</span></Link>;
        })}
      </nav>
    </>
  );
}
