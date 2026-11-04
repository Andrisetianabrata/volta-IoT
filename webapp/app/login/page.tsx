import type { Metadata } from "next";
import { LoginForm, LogoutButton } from "../../components/login-form";
import { sessionToken } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Masuk — VOLTA.",
  description: "Masuk atau daftar ke server VOLTA. lokal.",
};

export default async function LoginPage() {
  const sesi = await sessionToken();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="reveal mx-auto w-full max-w-[560px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8" style={{ borderRadius: "var(--radius)" }}>
        {sesi ? (
          <div>
            <p className="font-mono2 text-[13px] text-[var(--color-muted)]">sesi aktif</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-tight">Kamu sudah masuk.</h1>
            <p className="mt-3 text-[15px] text-[var(--color-muted)]">
              Token sesi tersimpan di cookie httpOnly. Keluar akan menghapusnya dari browser ini.
            </p>
            <div className="mt-6">
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div>
            <p className="font-mono2 text-[13px] text-[var(--color-muted)]">akun server lokal</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-tight">Masuk ke VOLTA.</h1>
            <p className="mt-3 text-[15px] text-[var(--color-muted)]">
              Satu akun untuk semua tab: monitor, device, dan dashboard. Daftar langsung masuk otomatis.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
