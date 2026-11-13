import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { PresenceHeartbeat } from "@/app/presence-heartbeat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gültepe Sosyal",
  applicationName: "Gültepe Sosyal",
  description: "Gültepe Sosyal fotoğraf ve video paylaşım topluluğu.",
  icons: {
    icon: "/gultepe-sosyal-logo.jpg",
    apple: "/gultepe-sosyal-logo.jpg",
  },
};

export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("sosyalmedya_theme")?.value;
  const themePreference = theme === "DARK" || theme === "LIGHT" ? theme : "SYSTEM";
  return (
    <html
      lang="tr"
      data-theme={themePreference}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${themePreference === "DARK" ? "dark" : ""}`}
    >
      <body className="min-h-full flex flex-col"><PresenceHeartbeat />{children}</body>
    </html>
  );
}
