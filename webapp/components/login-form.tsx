"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* Formulir masuk/daftar. Pesan error selalu teks, bukan warna saja. */

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function keluar() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }
  return (
    <Button type="button" variant="outline" onClick={keluar} disabled={busy} className="min-h-[44px]">
      {busy ? "Keluar…" : "Keluar"}
    </Button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (!mail.includes("@")) {
      setError("Isi alamat email yang valid.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: mail, password }),
      });
      const j = (await r.json().catch(() => null)) as { error?: { message?: string }; ok?: boolean } | null;
      if (!r.ok || !j?.ok) {
        setError(j?.error?.message ?? "Login gagal. Coba lagi.");
        return;
      }
      router.push("/dashboards");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Pilih masuk atau daftar" className="flex gap-2">
        {(["login", "register"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            variant={mode === m ? "default" : "outline"}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className="min-h-[44px]"
          >
            {m === "login" ? "Masuk" : "Daftar"}
          </Button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="font-mono2 text-[13px] text-[var(--color-muted)]">
            Alamat email
          </label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={mode === "login" ? "email" : "off"}
            placeholder="nama@kantor.id"
            className="mt-2 min-h-[44px]"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="font-mono2 text-[13px] text-[var(--color-muted)]">
            Kata sandi
          </label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="minimal 8 karakter"
            className="mt-2 min-h-[44px]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-[15px] text-[var(--color-text)]">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="min-h-[44px] bg-[var(--color-primary)] text-[var(--primary-foreground)] hover:bg-[var(--color-primary)] hover:opacity-85">
          {busy ? "Tunggu…" : mode === "login" ? "Masuk" : "Daftar dan masuk"}
        </Button>
      </form>
    </div>
  );
}
