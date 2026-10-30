import { mkdir, readdir, rename, rmdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

const publicDirectory = path.join(process.cwd(), "public", "uploads");
const privateDirectory = path.join(process.cwd(), "private-uploads");
const safeUploadName = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif|mp4|webm|mov)$/i;

async function main() {
  let entries: Dirent[] = [];
  let foundPublicDirectory = false;
  try {
    entries = await readdir(publicDirectory, { withFileTypes: true });
    foundPublicDirectory = true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      console.log("No public uploads directory found.");
    } else throw error;
  }

  let movedCount = 0;
  if (foundPublicDirectory) {
    await mkdir(privateDirectory, { recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!safeUploadName.test(entry.name)) {
        throw new Error(`Unexpected upload filename: ${entry.name}`);
      }
      await rename(path.join(publicDirectory, entry.name), path.join(privateDirectory, entry.name));
      movedCount += 1;
    }
    await rmdir(publicDirectory);
    console.log(`Moved ${movedCount} existing media file(s) to private storage.`);
  }
}

void main().catch((error: unknown) => {
  console.error("Could not move existing uploads:", error);
  process.exitCode = 1;
});
