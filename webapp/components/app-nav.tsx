"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronRight,
  Cpu,
  HeartPulse,
  LayoutGrid,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/login-form";

/* Shell app (DESIGN-APP.md): sidebar 240px desktop dengan sekat border,
   topbar 48px + lembar menu di HP. Aktif = tint aksen pill 8px. Tanpa motif landing. */

const GROUPS = [
  {
    label: "Pantau",
    tabs: [
      { href: "/monitor", label: "Monitor", Icon: Activity },
      { href: "/devices", label: "Devices", Icon: Cpu },
    ],
  },
  {
    label: "Kelola",
    tabs: [
      { href: "/dashboards", label: "Dashboards", Icon: LayoutGrid },
      { href: "/health", label: "Health", Icon: HeartPulse },
      { href: "/settings", label: "Settings", Icon: Settings },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRows({ pathname, onNav, big }: { pathname: string; onNav?: () => void; big?: boolean }) {
  return (
    <>
      {GROUPS.map((g) => (
        <div key={g.label} className={big ? "mt-6 first:mt-2" : "mt-5 first:mt-1"}>
          <p className={cn("font-mono2 text-[12px] text-[var(--color-muted)]", big ? "px-4" : "px-3")}>{g.label}</p>
          <ul className="mt-1">
            {g.tabs.map(({ href, label, Icon }) => {
              const aktif = isActive(pathname, href);
              return (
                <li key={href} className={big ? "px-2" : "px-2"}>
                  <Link
                    href={href}
                    onClick={onNav}
                    aria-current={aktif ? "page" : undefined}
                    className={cn(
                      big ? "min-h-[52px] text-[16px]" : "min-h-[34px] text-[14px]",
                      "flex items-center gap-3 px-3 font-medium",
                      aktif
                        ? "bg-[var(--color-accent-tint)] font-semibold text-[var(--color-accent-ink)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    )}
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <Icon
                      aria-hidden="true"
                      size={big ? 20 : 16}
                      strokeWidth={1.5}
                      className={aktif ? "text-[var(--color-accent)]" : undefined}
                    />
                    {label}
                    {big && aktif ? (
                      <ChevronRight aria-hidden="true" size={18} className="ml-auto" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

const SCREEN_NAMES: Array<[RegExp, string]> = [
  [/^\/monitor/, "Monitor"],
  [/^\/devices\/[^/]+/, "Device"],
  [/^\/devices/, "Devices"],
  [/^\/dashboards\/[^/]+/, "Board"],
  [/^\/dashboards/, "Dashboards"],
  [/^\/health/, "Health"],
  [/^\/settings/, "Settings"],
];

function screenName(pathname: string) {
  for (const [re, name] of SCREEN_NAMES) if (re.test(pathname)) return name;
  return "VOLTA.";
}

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex">
        <Link
          href="/dashboards"
          aria-label="VOLTA. ke daftar board"
          className="flex h-16 shrink-0 items-center gap-2 px-5"
        >
          <img src="/volta-horizontal.svg" alt="VOLTA." width={110} height={26} className="block dark:hidden" />
          <img
            src="/volta-horizontal-reversed.svg"
            alt=""
            aria-hidden="true"
            width={110}
            height={26}
            className="hidden dark:block"
          />
        </Link>
        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-2 pb-4">
          <NavRows pathname={pathname} />
        </nav>
        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--color-rule)] p-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <div className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-1 bg-[var(--color-ground)] px-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={open}
          className="inline-flex size-11 cursor-pointer items-center justify-center text-[var(--color-text)]"
        >
          <Menu aria-hidden="true" size={22} strokeWidth={1.75} />
        </button>
        <p className="text-[17px] font-bold tracking-tight text-[var(--color-text)]">{screenName(pathname)}</p>
      </div>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Menu navigasi" className="fixed inset-0 z-50 flex flex-col bg-[var(--color-ground)] md:hidden">
          <div className="flex h-12 shrink-0 items-center justify-between px-2">
            <p className="px-2 text-[17px] font-bold tracking-tight text-[var(--color-text)]">
              VOLTA<span className="text-[var(--color-accent)]">.</span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu navigasi"
              autoFocus
              className="inline-flex size-11 cursor-pointer items-center justify-center text-[var(--color-text)]"
            >
              <X aria-hidden="true" size={22} strokeWidth={1.75} />
            </button>
          </div>
          <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-2 pb-4" data-lenis-prevent>
            <NavRows pathname={pathname} onNav={() => setOpen(false)} big />
          </nav>
          <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--color-rule)] p-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      ) : null}
    </>
  );
}
