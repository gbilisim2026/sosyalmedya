import Link from "next/link";
import { redirect } from "next/navigation";
import { clearSearchHistoryAction, saveRecommendationPreferencesAction } from "@/app/actions/social";
import { recommendationCategories } from "@/lib/recommendation-categories";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clearWatchHistoryAction } from "@/app/actions/social";

export const instant = false;

export default async function RecommendationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const [preference, searches] = await Promise.all([
    prisma.recommendationPreference.findUnique({
      where: { userId: user.id },
      include: { interests: { select: { category: true } } },
    }),
    prisma.searchHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const interests = new Set(preference?.interests.map((item) => item.category) ?? []);
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/settings" className="text-sm text-[#557260] hover:underline">← Ayarlara dön</Link>
        <h1 className="mt-4 text-2xl font-semibold">İlgi alanları ve öneriler</h1>
        <p className="mt-2 text-sm leading-6 text-[#68716b]">
          Öneriler; beğeni, yorum, kaydetme, yeniden paylaşma, takip, izleme süresi ve tekrar izleme sinyallerini kullanır.
          İzleme geçmişin hesabına özeldir. Arama geçmişi yalnızca öneriler açıkken kaydedilir. Bu tercihler sunucuda saklanır;
          kişiselleştirmeyi kapatınca akış güncellik ve gerçek etkileşim toplamlarına göre sıralanır.
        </p>
        {query.saved && <p role="status" className="mt-4 rounded-lg bg-[#edf4e9] p-3 text-sm text-[#315b46]">Öneri tercihlerin kaydedildi.</p>}
        {query.error === "category" && <p role="alert" className="mt-4 rounded-lg bg-[#fff0ed] p-3 text-sm text-[#a53f30]">Kategori seçimi geçersiz.</p>}
        <form action={saveRecommendationPreferencesAction} className="mt-6 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input type="checkbox" name="personalizedEnabled" defaultChecked={preference?.personalizedEnabled ?? true} className="mt-0.5 size-4 accent-[#315b46]" />
            Kişiselleştirilmiş önerileri etkinleştir
          </label>
          <p className="ml-7 mt-1 text-xs text-[#788179]">Kapalıyken ilgi ve etkileşim sinyalleri sıralamada kullanılmaz.</p>
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">İlgi alanların</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {recommendationCategories.map(({ value, label }) => <label key={value} className="flex items-center gap-2 rounded-lg border border-[#edf0eb] p-3 text-sm">
                <input type="checkbox" name="interests" value={value} defaultChecked={interests.has(value)} className="size-4 accent-[#315b46]" />{label}
              </label>)}
            </div>
          </fieldset>
          <button className="mt-5 h-10 rounded-lg bg-[#203d34] px-4 text-sm font-semibold text-white">Tercihleri kaydet</button>
        </form>
        <section className="mt-5 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <h2 className="font-semibold">Geçmişini yönet</h2>
          <p className="mt-1 text-xs text-[#68716b]">Geçmiş kayıtlarını temizlemek, gönderilerin ve hikâyelerin gerçek toplam görüntülenme istatistiklerini silmez; yalnızca sana bağlı görüntüleme kayıtlarını kaldırır.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={clearSearchHistoryAction}><button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">Arama geçmişini temizle</button></form>
            <form action={clearWatchHistoryAction}><button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold">İzleme geçmişini temizle</button></form>
          </div>
          {searches.length > 0 && <div className="mt-4 border-t border-[#edf0eb] pt-3">
            <h3 className="text-xs font-semibold text-[#68716b]">Son aramalar</h3>
            <ul className="mt-2 flex flex-wrap gap-2">{searches.map((item) => <li key={item.id} className="rounded-full bg-[#f1f4ef] px-3 py-1 text-xs">{item.query}</li>)}</ul>
          </div>}
        </section>
      </section>
    </main>
  );
}
