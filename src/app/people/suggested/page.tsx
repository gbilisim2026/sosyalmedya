import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
import { FollowSuggestionButton } from "@/app/profile/[username]/profile-actions";
import { DismissSuggestionButton } from "@/app/recommendation-controls";
import { UserAvatar } from "@/app/user-avatar";
import { getSuggestedPeople } from "@/lib/recommendations";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default async function SuggestedPeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const people = await getSuggestedPeople(user.id, user.id, 60);
  return (
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/" className="text-sm text-[#557260] hover:underline">← Akışa dön</Link>
        <h1 className="mt-4 text-2xl font-semibold">Yeni insanları keşfet</h1>
        <p className="mt-2 text-sm text-[#68716b]">Takip ağınla kesişen, takip etmediğin ve gizlemediğin gerçek hesaplar.</p>
        <div className="mt-5 divide-y divide-[#edf0eb] rounded-2xl border border-[#e1e6df] bg-white px-4">
          {people.map((person) => <article key={person.id} className="flex items-center gap-3 py-4">
            <Link href={`/profile/${encodeURIComponent(person.username)}`}><UserAvatar {...person} className="size-12" /></Link>
            <span className="min-w-0 flex-1"><Link href={`/profile/${encodeURIComponent(person.username)}`} className="block truncate text-sm font-semibold hover:underline">{person.displayName ?? person.username}</Link><span className="block text-xs text-[#788179]">@{person.username} · {person._count.followers} takipçi</span></span>
            <FollowSuggestionButton username={person.username} />
            <DismissSuggestionButton userId={person.id} />
          </article>)}
          {!people.length && <p className="py-12 text-center text-sm text-[#788179]">Şu anda yeni hesap önerisi yok.</p>}
        </div>
      </section>
    </main>
  );
}
