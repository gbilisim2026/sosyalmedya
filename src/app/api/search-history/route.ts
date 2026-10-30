import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Oturum açman gerekiyor." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("query" in body) || typeof body.query !== "string") {
    return Response.json({ error: "Arama sorgusu geçersiz." }, { status: 400 });
  }
  const query = body.query.trim().slice(0, 100);
  if (query.length < 2) return Response.json({ recorded: false });
  const preference = await prisma.recommendationPreference.findUnique({
    where: { userId: user.id },
    select: { personalizedEnabled: true },
  });
  if (preference?.personalizedEnabled === false) return Response.json({ recorded: false });
  const recent = await prisma.searchHistory.findFirst({
    where: { userId: user.id, query, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
    select: { id: true },
  });
  if (!recent) await prisma.searchHistory.create({ data: { userId: user.id, query } });
  const old = await prisma.searchHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: 200,
    select: { id: true },
    take: 1000,
  });
  if (old.length) await prisma.searchHistory.deleteMany({ where: { id: { in: old.map(({ id }) => id) }, userId: user.id } });
  return Response.json({ recorded: true });
}
