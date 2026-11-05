import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./variant.css";
import { SmoothScroll } from "../components/smooth-scroll";
import { ThemeToggle } from "../components/theme-toggle";
import { Toaster } from "../components/ui/sonner";
import { LogoutButton } from "../components/login-form";
import { sessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { display, mono, jost } from "./fonts";

export const metadata: Metadata = {
  title: "VOLTA. Server IoT lokal untuk ESP32",
  description:
    "Server IoT MQTT open source (MIT): pantau pin live, kirim perintah, dan susun dashboard tanpa rilis ulang. Install dalam hitungan menit.",
  icons: {
    icon: [
      { url: "/favicon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon.svg" },
    ],
  },
};

const themeInit = `(function(){try{var s=localStorage.getItem("volta-theme");var t=s||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesi = await sessionToken();
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const inApp =
    pathname.startsWith("/monitor") ||
    pathname.startsWith("/devices") ||
    pathname.startsWith("/dashboards") ||
    pathname.startsWith("/health") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/login");
  return (
    <html lang="id" data-theme="light" className={cn(display.variable, mono.variable, jost.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-svh antialiased">
        <SmoothScroll />
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-50 focus:border focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)] focus:px-4 focus:py-2 focus:text-[15px] focus:font-semibold focus:text-[var(--color-text)] focus:outline-2"
        >
          Lewati ke konten
        </a>
        {!inApp && (
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#atas" className="flex items-center gap-2" aria-label="VOLTA beranda">
            <img src="/volta-horizontal.svg" alt="VOLTA" width={120} height={28} className="block dark:hidden" />
            <img
              src="/volta-horizontal-reversed.svg"
              alt=""
              aria-hidden="true"
              width={120}
              height={28}
              className="hidden dark:block"
            />
          </a>
          <nav aria-label="Navigasi utama" className="flex items-center gap-5 text-[15px]">
            <a href="#fitur" className="hidden sm:inline hover:underline underline-offset-4">Fitur</a>
            <a href="#cara" className="hidden sm:inline hover:underline underline-offset-4">Cara kerja</a>
            <a href="#faq" className="hidden sm:inline hover:underline underline-offset-4">FAQ</a>
            <a href="#install" className="hidden sm:inline hover:underline underline-offset-4">Install</a>
            <ThemeToggle />
            {sesi ? (
              <LogoutButton />
            ) : (
              <Button asChild variant="outline" className="min-h-[44px]">
                <a href="/login">Masuk</a>
              </Button>
            )}
            <Button asChild className="min-h-[44px] bg-[var(--color-primary)] text-[var(--primary-foreground)] hover:bg-[var(--color-primary)] hover:opacity-85">
              <a href="#install">
                Install
              </a>
            </Button>
          </nav>
        </header>
        )}
        <main id="konten">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
