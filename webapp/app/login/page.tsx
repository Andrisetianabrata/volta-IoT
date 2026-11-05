import type { Metadata } from "next";
import { LoginForm, LogoutButton } from "../../components/login-form";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sessionToken } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Masuk — VOLTA.",
  description: "Masuk atau daftar ke server VOLTA. lokal.",
};

/* Auth (DESIGN-APP.md §6): kartu tengah 560px radius 8px, tanpa motif landing.
   Header auth minimal: merek + kembali ke situs + tema. Tanpa nav landing
   (#fitur/#cara tidak ada di halaman ini).
   OVERRIDE PEMILIK (R-37) atas DESIGN-APP §3: isi halaman ini memakai Jost
   (var(--font-variant)), judul tetap Montserrat, mono hanya untuk angka. */
function AuthHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <a href="/" className="flex items-baseline gap-2.5" aria-label="VOLTA. kembali ke beranda">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>VOLTA.</span>
        <span className="hidden text-[12px] text-[var(--color-muted)] sm:inline">server lokal</span>
      </a>
      <nav aria-label="Navigasi auth" className="flex min-h-[44px] items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="min-h-[44px]">
          <a href="/">Kembali ke situs</a>
        </Button>
        <ThemeToggle />
      </nav>
    </header>
  );
}

/* Auth (DESIGN-APP.md §6): kartu tengah 560px radius 8px, tanpa motif landing. */
export default async function LoginPage() {
  const sesi = await sessionToken();
  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-ground)] text-[var(--color-text)]" style={{ fontFamily: "var(--font-variant)" }}>
      <AuthHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-14 sm:px-6">
      <Card className="w-full max-w-[560px] p-6 sm:p-8" style={{ fontFamily: "var(--font-variant)" }}>
        {sesi ? (
          <div>
            <p className="text-[13px] text-[var(--color-muted)]">sesi aktif</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Kamu sudah masuk.</h1>
            <p className="mt-3 text-[15px] text-[var(--color-muted)]">
              Token sesi tersimpan di cookie httpOnly. Keluar akan menghapusnya dari browser ini.
            </p>
            <div className="mt-6">
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-[var(--color-muted)]">akun server lokal</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Masuk ke VOLTA.</h1>
            <p className="mt-3 text-[15px] text-[var(--color-muted)]">
              Satu akun untuk semua tab: monitor, device, dan dashboard. Daftar langsung masuk otomatis.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
