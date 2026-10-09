import { AuthForm } from "@/app/auth-form";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{ registered?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;
  return <AuthForm mode="login" registered={registered === "1"} />;
}