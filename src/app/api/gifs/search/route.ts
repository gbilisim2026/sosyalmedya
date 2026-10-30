import { getCurrentUser } from "@/lib/session";

type CommonsPage = {
  title?: string;
  imageinfo?: {
    url?: string;
    descriptionurl?: string;
    thumburl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return Response.json({ error: "Oturum açman gerekiyor." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return Response.json({ results: [] });
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "30");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|extmetadata");
  endpoint.searchParams.set("iiurlwidth", "480");
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "SosyalMedya/1.0 (GIF search)" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 300 },
  });
  if (!response.ok) return Response.json({ error: "GIF kataloğuna şu anda ulaşılamıyor." }, { status: 502 });
  const payload = await response.json() as { query?: { pages?: Record<string, CommonsPage> } };
  const results = Object.values(payload.query?.pages ?? []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const url = info?.url;
    const license = stripTags(info?.extmetadata?.LicenseShortName?.value ?? "");
    if (!page.title?.toLocaleLowerCase().endsWith(".gif") || !url || !url.startsWith("https://upload.wikimedia.org/") ||
        !info?.descriptionurl || !/public domain|cc0|cc by/i.test(license)) return [];
    return [{
      title: page.title.replace(/^File:/, ""),
      url,
      previewUrl: info.thumburl ?? url,
      license,
      attributionUrl: info.descriptionurl,
    }];
  }).slice(0, 12);
  return Response.json({ results }, { headers: { "Cache-Control": "private, max-age=60" } });
}
