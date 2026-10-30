import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { changePasswordAction, toggleCloseFriendAction, unblockUserAction, updateAccountSettingsAction, updateThemePreferenceAction, updateActivityStatusPreferenceAction } from "@/app/actions/social";
import { saveAccountAction } from "@/app/actions/auth";

export const instant = false;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const [following, friends, blocked, savedAccounts] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.closeFriend.findMany({ where: { ownerId: user.id }, select: { friendId: true } }),
    prisma.userBlock.findMany({
      where: { blockerId: user.id },
      include: { blocked: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.savedAccount.findMany({
      where: { ownerId: user.id },
      include: { account: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const friendIds = new Set(friends.map((friend) => friend.friendId));

  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href={`/profile/${encodeURIComponent(user.username)}`} className="text-sm text-[#557260] hover:underline">← Profile dön</Link>
        <h1 className="mt-4 text-2xl font-semibold">Hesap ayarları</h1>
        {query.error && <p role="alert" className="mt-4 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">
          {query.error === "taken" ? "Bu kullanıcı adı zaten kullanımda." : query.error === "password" ? "Mevcut şifre hatalı veya yeni şifre kurallara uymuyor." : "Kullanıcı adı geçerli değil."}
        </p>}
        {(query.updated || query.passwordUpdated) && <p role="status" className="mt-4 rounded-lg bg-[#edf4e9] p-3 text-sm text-[#315b46]">Değişiklikler kaydedildi.</p>}
        {(query.accountAdded || query.themeUpdated || query.statusUpdated) && <p role="status" className="mt-4 rounded-lg bg-[#edf4e9] p-3 text-sm text-[#315b46]">Tercihin kaydedildi.</p>}
        {query.accountError && <p role="alert" className="mt-4 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">
          {query.accountError === "limit" ? "En fazla 10 hesap bağlayabilirsin." : query.accountError === "unauthorized" ? "Bu hesapla geçiş yetkin yok." : "Hesap bilgileri doğrulanamadı."}
        </p>}
        {query.error === "theme" && <p role="alert" className="mt-4 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Tema tercihi geçersiz.</p>}

        <section id="accounts" className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Hesap değiştir</h2>
          <p className="mt-1 text-sm text-[#68716b]">Hesap eklemek için o hesabın parolasını bir kez doğrula; sonraki geçişlerde mevcut oturum kapanmaz.</p>
          <div className="mt-3 divide-y divide-[#edf0eb]">
            {savedAccounts.map(({ account }) => <p key={account.id} className="py-2 text-sm">@{account.username} kayıtlı</p>)}
            {savedAccounts.length === 0 && <p className="py-2 text-sm text-[#788179]">Henüz başka hesap eklenmedi.</p>}
          </div>
          <form action={saveAccountAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Hesap kullanıcı adı
              <input name="username" required minLength={3} maxLength={30} autoComplete="username" className="mt-1 h-10 w-full rounded-lg border border-[#dce2dc] px-3" />
            </label>
            <label className="text-sm font-medium">Hesap parolası
              <input name="password" type="password" required autoComplete="current-password" className="mt-1 h-10 w-full rounded-lg border border-[#dce2dc] px-3" />
            </label>
            <button className="h-10 w-fit rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Hesabı güvenle ekle</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Görünüm</h2>
          <form action={updateThemePreferenceAction} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">Tema
              <select name="theme" defaultValue={user.themePreference} className="mt-1 block h-10 rounded-lg border border-[#dce2dc] bg-white px-3">
                <option value="SYSTEM">Sistem tercihini izle</option><option value="LIGHT">Aydınlık</option><option value="DARK">Karanlık</option>
              </select>
            </label>
            <button className="h-10 rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Temayı uygula</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Çevrimiçi durumu</h2>
          <p className="mt-1 text-sm text-[#68716b]">Kapalıyken diğer kullanıcılara çevrimiçi veya son görülme bilgin gösterilmez.</p>
          <form action={updateActivityStatusPreferenceAction} className="mt-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showActivityStatus" defaultChecked={user.showActivityStatus} className="size-4 accent-[#315b46]" />Hareket durumumu göster</label>
            <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Kaydet</button>
          </form>
        </section>

        <section className="mt-5 flex flex-wrap gap-2">
          <Link href="/activity" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Hareketlerin</Link>
          <Link href="/watch-history" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">İzleme geçmişi</Link>
          <Link href="/explore" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">Keşfet</Link>
          <Link href="/settings/interests" className="rounded-lg border border-[#dce2dc] bg-white px-3 py-2 text-xs font-semibold">İlgi alanları ve öneriler</Link>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Profil ve gizlilik</h2>
          <form action={updateAccountSettingsAction} className="mt-4 space-y-4">
            <label className="block text-sm font-medium">Kullanıcı adı
              <input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" defaultValue={user.username} className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] px-3" />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-[#dce2dc] p-3 text-sm">
              <input name="isPrivate" type="checkbox" defaultChecked={user.isPrivate} className="size-4 accent-[#315b46]" />
              Gizli hesap (yalnızca onaylı takipçiler içeriği görebilir)
            </label>
            <button className="h-10 rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Ayarları kaydet</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Şifre değiştir</h2>
          <form action={changePasswordAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Mevcut şifre
              <input name="currentPassword" type="password" autoComplete="current-password" required className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] px-3" />
            </label>
            <label className="text-sm font-medium">Yeni şifre
              <input name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] px-3" />
            </label>
            <button className="h-10 w-fit rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white sm:col-span-2">Şifreyi güncelle</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Yakın arkadaşlar</h2>
          <p className="mt-1 text-sm text-[#68716b]">Hikâye ve gönderilerde yalnızca yakın arkadaşlarına özel hedef kitle kullanabilirsin.</p>
          <div className="mt-3 divide-y divide-[#edf0eb]">
            {following.map(({ following: person }) => <div key={person.id} className="flex items-center justify-between gap-3 py-3">
              <Link href={`/profile/${encodeURIComponent(person.username)}`} className="text-sm font-medium hover:underline">@{person.username}</Link>
              <form action={toggleCloseFriendAction.bind(null, person.id)}>
                <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">{friendIds.has(person.id) ? "Listeden çıkar" : "Yakın arkadaş ekle"}</button>
              </form>
            </div>)}
            {following.length === 0 && <p className="py-4 text-sm text-[#788179]">Yakın arkadaş eklemek için önce kullanıcıları takip et.</p>}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Engellenen hesaplar</h2>
          <div className="mt-3 divide-y divide-[#edf0eb]">
            {blocked.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm">@{entry.blocked.username}</span>
              <form action={unblockUserAction.bind(null, entry.id)}>
                <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Engeli kaldır</button>
              </form>
            </div>)}
            {blocked.length === 0 && <p className="py-4 text-sm text-[#788179]">Engellenen hesap yok.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
