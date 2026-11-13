"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { BrandLogo } from "@/app/brand-logo";

type AuthFormProps = {
  mode: "login" | "register";
  registered?: boolean;
};

export function AuthForm({ mode, registered = false }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isRegistering = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f2] px-5 py-12 text-[#202522]">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(28,43,33,0.12)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden bg-[#203d34] p-10 text-white md:flex">
          <div className="absolute -right-20 top-28 h-64 w-64 rounded-full border-[34px] border-white/10" />
          <div className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-gradient-to-br from-[#8d4de8]/35 to-[#ed4c79]/20 blur-sm" />
          <BrandLogo className="brand-logo-light relative z-10 text-xl font-bold tracking-tight text-white" imageSize={52} />
          <div className="relative z-10 max-w-sm pb-5">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#d3cbff]">
              Yakın kal
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Anlarını paylaş, kendi çevreni bul.
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
              Fotoğraflar, kısa videolar ve günlük hikâyeler için sana ait bir alan.
            </p>
          </div>
        </div>

        <div className="flex min-h-[640px] flex-col justify-center px-7 py-10 sm:px-12">
          <BrandLogo className="mb-12 text-lg font-bold tracking-tight text-[#203d34] md:hidden" imageSize={48} />
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-[#64806f]">
              {isRegistering ? "Yeni bir başlangıç" : "Tekrar hoş geldin"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {isRegistering ? "Hesabını oluştur" : "Giriş yap"}
            </h2>
            <p className="mt-2 text-sm text-[#68716b]">
              {isRegistering
                ? "E-posta gerekmez; kullanıcı adınla katıl."
                : "Akışına kaldığın yerden devam et."}
            </p>
          </div>

          {registered && (
            <p className="mb-5 rounded-lg bg-[#edf6e7] px-4 py-3 text-sm text-[#315b32]">
              Hesabın oluşturuldu. Şimdi giriş yapabilirsin.
            </p>
          )}

          <form action={formAction} className="space-y-5">
            <label className="block text-sm font-medium">
              Kullanıcı adı
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                autoComplete="username"
                className="mt-2 h-12 w-full rounded-lg border border-[#dce2dc] bg-white px-3.5 outline-none transition focus:border-[#4f8266] focus:ring-2 focus:ring-[#4f8266]/15"
                placeholder="kullanici_adi"
              />
            </label>

            <label className="block text-sm font-medium">
              Şifre
              <span className="relative mt-2 block">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isRegistering ? 8 : undefined}
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  className="h-12 w-full rounded-lg border border-[#dce2dc] bg-white px-3.5 pr-12 outline-none transition focus:border-[#4f8266] focus:ring-2 focus:ring-[#4f8266]/15"
                  placeholder={isRegistering ? "En az 8 karakter" : "Şifren"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#68716b] hover:text-[#203d34]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {isRegistering && (
              <label className="block text-sm font-medium">
                Şifre tekrarı
                <span className="relative mt-2 block">
                  <input
                    name="confirmPassword"
                    type={showConfirmation ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-lg border border-[#dce2dc] bg-white px-3.5 pr-12 outline-none transition focus:border-[#4f8266] focus:ring-2 focus:ring-[#4f8266]/15"
                    placeholder="Şifreni tekrar yaz"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    aria-label={showConfirmation ? "Şifreyi gizle" : "Şifreyi göster"}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#68716b] hover:text-[#203d34]"
                  >
                    {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            )}

            {state.error && (
              <p role="alert" className="rounded-lg bg-[#fff0ed] px-4 py-3 text-sm text-[#a53f30]">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-lg bg-[#203d34] px-4 font-semibold text-white transition hover:bg-[#2c5145] disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Bekle..." : isRegistering ? "Hesap oluştur" : "Giriş yap"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#68716b]">
            {isRegistering ? "Zaten hesabın var mı?" : "Henüz hesabın yok mu?"}{" "}
            <Link
              href={isRegistering ? "/login" : "/register"}
              className="font-semibold text-[#315b46] underline-offset-4 hover:underline"
            >
              {isRegistering ? "Giriş yap" : "Kayıt ol"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}