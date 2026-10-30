import { prisma } from "@/lib/prisma";

export type ExternalVideoResult = {
  provider: "YOUTUBE" | "WIKIMEDIA_COMMONS" | "INTERNET_ARCHIVE";
  providerId: string;
  title: string;
  description: string | null;
  creatorName: string;
  creatorUrl: string;
  embedUrl: string;
  mediaUrl: string | null;
  sourceUrl: string;
  thumbnailUrl: string | null;
  licenseUrl: string | null;
  licenseName: string | null;
  publishedAt: Date | null;
};

const creativeCommonsLicensePattern = /^\/(?:licenses\/(?:by|by-sa)\/(?:3\.0|4\.0)|publicdomain\/(?:zero\/1\.0|mark\/1\.0))(?:\/|$)/;

function isAllowedLicense(licenseUrl: string | undefined) {
  if (!licenseUrl) return false;
  try {
    const url = new URL(licenseUrl);
    return (url.protocol === "https:" || url.protocol === "http:")
      && url.hostname === "creativecommons.org"
      && creativeCommonsLicensePattern.test(url.pathname);
  } catch {
    return false;
  }
}

async function persistExternalVideos(videos: ExternalVideoResult[], category: string | null) {
  if (!videos.length) return;
  await prisma.$transaction(videos.map((video) => prisma.externalVideo.upsert({
    where: { provider_providerId: { provider: video.provider, providerId: video.providerId } },
    create: { ...video, category, fetchedAt: new Date() },
    update: { ...video, category, fetchedAt: new Date() },
  })));
}

type YouTubeSearchResponse = {
  nextPageToken?: string;
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
    };
  }[];
};

export async function searchYouTubeVideos(query: string, category: string | null, pageToken?: string) {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) return { available: false as const, videos: [] };
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("part", "snippet");
  endpoint.searchParams.set("type", "video");
  endpoint.searchParams.set("videoEmbeddable", "true");
  endpoint.searchParams.set("safeSearch", "strict");
  endpoint.searchParams.set("maxResults", "12");
  endpoint.searchParams.set("order", "relevance");
  endpoint.searchParams.set("relevanceLanguage", "tr");
  endpoint.searchParams.set("q", query.slice(0, 100));
  if (pageToken) endpoint.searchParams.set("pageToken", pageToken);

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`YouTube Data API returned ${response.status}.`);
  const payload = await response.json() as YouTubeSearchResponse;
  const videos = (payload.items ?? []).flatMap((item) => {
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (!videoId || !/^[\w-]{11}$/.test(videoId) || !snippet?.title || !snippet.channelTitle || !snippet.channelId) return [];
    const creatorUrl = `https://www.youtube.com/channel/${encodeURIComponent(snippet.channelId)}`;
    const sourceUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    return [{
      provider: "YOUTUBE" as const,
      providerId: videoId,
      title: snippet.title.slice(0, 300),
      description: snippet.description?.slice(0, 4000) || null,
      creatorName: snippet.channelTitle.slice(0, 200),
      creatorUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`,
      mediaUrl: null,
      sourceUrl,
      thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? null,
      licenseUrl: null,
      licenseName: null,
      publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
    }];
  });
  await persistExternalVideos(videos, category);
  return {
    available: true as const,
    videos,
    nextPageToken: payload.nextPageToken ?? null,
  };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function rssTagValue(item: string, tag: string) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = item.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapedTag}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

export function parseInternetArchiveRss(feed: string): ExternalVideoResult[] {
  const items = [...feed.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return items.flatMap((item) => {
    const title = rssTagValue(item, "media:title") || rssTagValue(item, "title");
    const sourceUrl = rssTagValue(item, "link");
    const licenseUrl = rssTagValue(item, "creativeCommons:license");
    let identifier = "";
    let parsedSourceUrl: URL;
    try {
      parsedSourceUrl = new URL(sourceUrl);
      if (parsedSourceUrl.protocol !== "https:" || parsedSourceUrl.hostname !== "archive.org") return [];
      identifier = parsedSourceUrl.pathname.match(/^\/details\/([\w.-]{1,80})/)?.[1] ?? "";
    } catch {
      return [];
    }
    if (!identifier || !title || !isAllowedLicense(licenseUrl)) return [];
    const thumbnailMatch = item.match(/<media:thumbnail\b[^>]*\burl="([^"]+)"/i);
    const publishedAtValue = rssTagValue(item, "pubDate");
    return [{
      provider: "INTERNET_ARCHIVE" as const,
      providerId: identifier,
      title: title.slice(0, 300),
      description: plainMetadata(rssTagValue(item, "description"), 4000) || null,
      creatorName: "Internet Archive kaydı",
      creatorUrl: sourceUrl,
      embedUrl: `https://archive.org/embed/${encodeURIComponent(identifier)}`,
      mediaUrl: null,
      sourceUrl: parsedSourceUrl.toString(),
      thumbnailUrl: thumbnailMatch ? decodeXml(thumbnailMatch[1]) : `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
      licenseUrl: licenseUrl!,
      licenseName: licenseUrl!.includes("publicdomain") ? "CC0 / Public Domain" : licenseUrl!.includes("by-sa") ? "CC BY-SA" : "CC BY",
      publishedAt: publishedAtValue && !Number.isNaN(Date.parse(publishedAtValue)) ? new Date(publishedAtValue) : null,
    }];
  });
}

export async function searchInternetArchiveVideos(query: string, category: string | null, pageToken?: string) {
  const safeTerm = query.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ") || "short film";
  const start = Math.min(960, Math.max(0, Number.parseInt(pageToken ?? "0", 10) || 0));
  const licenseQuery = [
    'licenseurl:"https://creativecommons.org/publicdomain/zero/1.0/"',
    'licenseurl:"https://creativecommons.org/licenses/by/4.0/"',
    'licenseurl:"https://creativecommons.org/licenses/by-sa/4.0/"',
    'licenseurl:"https://creativecommons.org/licenses/by/3.0/"',
    'licenseurl:"https://creativecommons.org/licenses/by-sa/3.0/"',
  ].join(" OR ");
  const params = new URLSearchParams({
    q: `mediatype:movies AND (${licenseQuery}) AND (title:"${safeTerm}" OR description:"${safeTerm}")`,
    rows: "12",
    start: String(start),
    output: "rss",
  });
  const response = await fetch(`https://archive.org/advancedsearch.php?${params}`, {
    headers: { Accept: "application/rss+xml, application/xml" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`Internet Archive returned ${response.status}.`);
  const videos = parseInternetArchiveRss(await response.text());
  await persistExternalVideos(videos, category);
  return {
    available: true as const,
    videos,
    nextPageToken: videos.length === 12 ? String(start + 12) : null,
  };
}

type WikimediaResponse = {
  continue?: { gsroffset?: number };
  query?: {
    pages?: Record<string, {
      pageid?: number;
      title?: string;
      imageinfo?: {
        url?: string;
        thumburl?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }>;
  };
};

function plainMetadata(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function searchWikimediaVideos(query: string, category: string | null, pageToken?: string) {
  const safeTerm = query.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ") || "video";
  const offset = Math.min(1000, Math.max(0, Number.parseInt(pageToken ?? "0", 10) || 0));
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:video ${safeTerm}`,
    gsrnamespace: "6",
    gsrlimit: "12",
    gsroffset: String(offset),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "640",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "GultepeSocial/1.0 (open video discovery)" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}.`);
  const payload = await response.json() as WikimediaResponse;
  const pages = Object.values(payload.query?.pages ?? {});
  const videos = pages.flatMap((page) => {
    const image = page.imageinfo?.[0];
    const metadata = image?.extmetadata;
    const mediaUrl = image?.url;
    const sourceUrl = image?.descriptionurl;
    const title = page.title?.replace(/^File:/, "");
    const licenseUrl = metadata?.LicenseUrl?.value;
    const licenseName = plainMetadata(metadata?.LicenseShortName?.value, 60);
    if (!image || !page.pageid || !title || !mediaUrl || !sourceUrl || !licenseName || !isAllowedLicense(licenseUrl)) return [];
    try {
      const parsedMediaUrl = new URL(mediaUrl);
      const parsedSourceUrl = new URL(sourceUrl);
      if (parsedMediaUrl.protocol !== "https:" || parsedSourceUrl.protocol !== "https:" || parsedMediaUrl.hostname !== "upload.wikimedia.org" || parsedSourceUrl.hostname !== "commons.wikimedia.org") return [];
      if (!/\.(?:webm|ogv|mp4)$/i.test(parsedMediaUrl.pathname)) return [];
    } catch {
      return [];
    }
    return [{
      provider: "WIKIMEDIA_COMMONS" as const,
      providerId: String(page.pageid),
      title: title.slice(0, 300),
      description: plainMetadata(metadata?.ImageDescription?.value, 4000) || null,
      creatorName: plainMetadata(metadata?.Artist?.value, 200) || "Wikimedia Commons contributor",
      creatorUrl: sourceUrl,
      embedUrl: "",
      mediaUrl,
      sourceUrl,
      thumbnailUrl: image.thumburl ?? null,
      licenseUrl: licenseUrl!,
      licenseName,
      publishedAt: metadata?.DateTimeOriginal?.value && !Number.isNaN(Date.parse(metadata.DateTimeOriginal.value))
        ? new Date(metadata.DateTimeOriginal.value)
        : null,
    }];
  });
  await persistExternalVideos(videos, category);
  return {
    available: true as const,
    videos,
    nextPageToken: payload.continue?.gsroffset ? String(payload.continue.gsroffset) : null,
  };
}
