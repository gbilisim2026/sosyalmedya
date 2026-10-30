import { timingSafeEqual } from "node:crypto";
import { archiveExpiredStories } from "@/lib/story-archive";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  const suppliedBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  if (!secret) return Response.json({ error: "Cron secret is not configured." }, { status: 503 });
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const archived = await archiveExpiredStories();
  return Response.json({ archived });
}
