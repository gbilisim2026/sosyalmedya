import Link from "next/link";
import { redirect } from "next/navigation";
import { PostForm } from "@/app/create/post-form";
import { SiteHeader } from "@/app/site-header";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default async function CreatePostPage({ searchParams }: { searchParams: Promise<{ reel?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { reel } = await searchParams;
  const reelMode = reel === "1";

  return (
    <main className="min-h-screen bg-[#fafafa] pb-20 text-[#17171b] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <Link href="/" className="text-sm font-medium text-[#686873] hover:text-[#17171b]">← Akışa dön</Link>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777781]">Paylaşım alanı</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{reelMode ? "Yeni Reels" : "Yeni gönderi"}</h1>
          <p className="mt-2 text-sm leading-6 text-[#73737d]">{reelMode ? "Dikey video paylaş ve Reels akışına ekle." : "Anını paylaş. Birden fazla fotoğraf ekleyip sıralamasını yayınlamadan önce düzenleyebilirsin."}</p>
        </div>
        <div className="mt-7 rounded-[22px] border border-[#e8e8ec] bg-white p-5 shadow-[0_8px_32px_rgba(20,20,24,0.04)] sm:p-7">
          <PostForm reelMode={reelMode} />
        </div>
      </section>
    </main>
  );
}