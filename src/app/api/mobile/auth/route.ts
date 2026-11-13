import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9_]+$/);

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return response({ error: "Oturum açman gerekiyor." }, 401);

  return response({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
    },
  });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = z
    .object({ username: usernameSchema, password: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) {
    return response({ error: "Kullanıcı adı veya şifre hatalı." }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { usernameKey: parsed.data.username.toLowerCase() },
  });
  if (!user || !(await verify(user.passwordHash, parsed.data.password))) {
    return response({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
  }

  await createSession(user.id);
  return response({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
    },
  });
}

export async function PUT(request: Request) {
  const body = await readJson(request);
  const parsed = z
    .object({
      username: usernameSchema,
      password: z.string().min(8),
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword)
    .safeParse(body);
  if (!parsed.success) {
    return response({ error: "Kayıt bilgileri geçersiz." }, 400);
  }

  const { username, password } = parsed.data;
  try {
    await prisma.user.create({
      data: {
        username,
        usernameKey: username.toLowerCase(),
        passwordHash: await hash(password),
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return response({ error: "Bu kullanıcı adı zaten kullanılıyor." }, 409);
    }
    throw error;
  }

  return response({ registered: true }, 201);
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return response({ error: "Oturum açman gerekiyor." }, 401);
  await destroySession();
  return response({ signedOut: true });
}
