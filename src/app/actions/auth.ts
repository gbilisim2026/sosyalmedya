"use server";

import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type AuthState = { error?: string };

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Kullanıcı adı en az 3 karakter olmalı.")
  .max(30, "Kullanıcı adı en fazla 30 karakter olabilir.")
  .regex(/^[A-Za-z0-9_]+$/, "Yalnızca İngilizce harf, rakam ve alt çizgi kullan.");

const registrationSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor.",
  });

export async function registerAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const result = registrationSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) return { error: result.error.issues[0]?.message };

  const { username, password } = result.data;
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
      return { error: "Bu kullanıcı adı zaten kullanılıyor." };
    }
    throw error;
  }

  redirect("/login?registered=1");
}

export async function loginAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const result = z
    .object({ username: usernameSchema, password: z.string().min(1) })
    .safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
    });

  if (!result.success) return { error: "Kullanıcı adı veya şifre hatalı." };

  const user = await prisma.user.findUnique({
    where: { usernameKey: result.data.username.toLowerCase() },
  });
  if (!user || !(await verify(user.passwordHash, result.data.password))) {
    return { error: "Kullanıcı adı veya şifre hatalı." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}