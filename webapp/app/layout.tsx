import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Jost } from "next/font/google";
import { cn } from "@/lib/utils";
import ThemeFavicon from "@/components/theme-favicon";

const jost = Jost({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "VOLTA.",
  description: "VOLTA. web client",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", jost.variable)}>
      <body className="antialiased tabular-nums">
        <ThemeFavicon />
        {children}
      </body>
    </html>
  );
}
