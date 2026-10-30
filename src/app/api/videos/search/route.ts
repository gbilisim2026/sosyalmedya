import { getCurrentUser } from "@/lib/session";
import { recommendationCategories } from "@/lib/recommendation-categories";
import { searchInternetArchiveVideos, searchWikimediaVideos, searchYouTubeVideos } from "@/lib/external-videos";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Oturum açman gerekiyor." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 100) ?? "";
  const category = params.get("category") ?? "";
  const pageToken = params.get("pageToken")?.slice(0, 200) ?? "";
  const source = params.get("source") ?? "commons";
  if (!["commons", "archive", "youtube"].includes(source)) {
    return Response.json({ error: "Video kaynağı geçersiz." }, { status: 400 });
  }
  if (query.length < 2) return Response.json({ videos: [], available: source !== "youtube" || Boolean(process.env.YOUTUBE_DATA_API_KEY) });
  if (category && !recommendationCategories.some((item) => item.value === category)) {
    return Response.json({ error: "Kategori geçersiz." }, { status: 400 });
  }
  try {
    const result = source === "archive"
      ? await searchInternetArchiveVideos(query, category || null, pageToken || undefined)
      : source === "youtube"
        ? await searchYouTubeVideos(query, category || null, pageToken || undefined)
        : await searchWikimediaVideos(query, category || null, pageToken || undefined);
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error(`External video search failed for ${source}.`, error);
    return Response.json({ error: "Video kaynağı şu anda yanıt vermiyor. Biraz sonra yeniden dene." }, { status: 502 });
  }
}
