import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const allowedTypes: Record<string, { extension: string; mediaType: "PHOTO" | "VIDEO" }> = {
  "image/jpeg": { extension: "jpg", mediaType: "PHOTO" },
  "image/png": { extension: "png", mediaType: "PHOTO" },
  "image/webp": { extension: "webp", mediaType: "PHOTO" },
  "image/gif": { extension: "gif", mediaType: "PHOTO" },
  "video/mp4": { extension: "mp4", mediaType: "VIDEO" },
  "video/webm": { extension: "webm", mediaType: "VIDEO" },
  "video/quicktime": { extension: "mov", mediaType: "VIDEO" },
};

export async function saveUploadedMedia(file: File) {
  const type = allowedTypes[file.type];
  if (!type) throw new Error("JPG, PNG, WebP, GIF, MP4, WebM veya MOV dosyası seç.");

  const maxSize = type.mediaType === "VIDEO" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
  if (file.size === 0 || file.size > maxSize) {
    throw new Error(type.mediaType === "VIDEO" ? "Video en fazla 100 MB olabilir." : "Görsel en fazla 20 MB olabilir.");
  }

  const fileName = `${randomUUID()}.${type.extension}`;
  const uploadDirectory = path.join(process.cwd(), "private-uploads");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, fileName), Buffer.from(await file.arrayBuffer()));

  return {
    mediaType: type.mediaType,
    mediaUrl: `/media/${fileName}`,
  };
}