import { getCurrentUser } from "@/lib/session";

type AppleSong = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Oturum açman gerekiyor." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return Response.json({ results: [] });

  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.searchParams.set("term", query);
  endpoint.searchParams.set("entity", "song");
  endpoint.searchParams.set("limit", "12");
  endpoint.searchParams.set("country", "US");
  const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
  if (!response.ok) return Response.json({ error: "Müzik kataloğuna şu anda ulaşılamıyor." }, { status: 502 });
  const payload = await response.json() as { results?: AppleSong[] };
  const results = (payload.results ?? []).flatMap((song) => {
    if (!song.trackId || !song.trackName || !song.artistName || !song.artworkUrl100 || !song.previewUrl || !song.trackViewUrl) return [];
    return [{
      trackId: String(song.trackId),
      title: song.trackName,
      artist: song.artistName,
      artworkUrl: song.artworkUrl100.replace("100x100bb", "300x300bb"),
      previewUrl: song.previewUrl,
      trackUrl: song.trackViewUrl,
    }];
  });
  return Response.json({ results }, { headers: { "Cache-Control": "private, max-age=60" } });
}
