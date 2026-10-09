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
    <main className="min-h-screen bg-[#f4f6f2] pb-20 text-[#202522] md:pb-8">
      <SiteHeader username={user.username} />
      <section className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <Link href="/" className="text-sm text-[#557260] hover:underline">← Akışa dön</Link>
        <h1 className="mt-4 text-2xl font-semibold">{reelMode ? "Yeni Reels" : "Yeni gönderi"}</h1>
        <p className="mt-2 text-sm text-[#68716b]">{reelMode ? "Dikey video paylaş ve Reels akışına ekle." : "Metin, fotoğraf veya video paylaş."}</p>
        <div className="mt-7 rounded-2xl border border-[#e1e6df] bg-white p-5 sm:p-7">
          <PostForm reelMode={reelMode} />
        </div>
      </section>
    </main>
  );
}