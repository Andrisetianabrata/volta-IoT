"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

/* Formulir masuk/daftar (DESIGN-APP.md §6). Tab sebagai segmented control
   8px. Validasi per-input di bawah input; error sistem via sonner. */

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
  const [show, setShow] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    let valid = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setEmailError("Isi alamat email yang valid.");
      valid = false;
    } else {
      setEmailError(null);
    }
    if (password.length < 8) {
      setPasswordError("Kata sandi minimal 8 karakter.");
      valid = false;
    } else {
      setPasswordError(null);
    }
    if (!valid) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: mail, password }),
      });
      const j = (await r.json().catch(() => null)) as { error?: { code?: string; message?: string }; ok?: boolean } | null;
      if (!r.ok || !j?.ok) {
        const msg = j?.error?.message ?? "Login gagal. Coba lagi.";
        // Email sudah terdaftar = validasi per-input, sisanya error sistem.
        if (j?.error?.code === "EXISTS") {
          setEmailError(msg);
        } else {
          toast.error(msg);
        }
        return;
      }
      router.push("/dashboards");
      router.refresh();
    } catch {
      toast.error("Server tidak terjangkau. Pastikan server jalan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Pilih masuk atau daftar" className="grid grid-cols-2 gap-1 border border-[var(--color-border)] bg-[var(--color-raised)] p-1" style={{ borderRadius: "var(--radius)" }}>
        {(["login", "register"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            variant={mode === m ? "default" : "ghost"}
            onClick={() => {
              setMode(m);
              setEmailError(null);
              setPasswordError(null);
            }}
            className="min-h-[44px]"
          >
            {m === "login" ? "Masuk" : "Daftar"}
          </Button>
        ))}
      </div>
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="text-[12px] text-[var(--color-muted)]">
            Alamat email
          </label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            autoComplete={mode === "login" ? "email" : "off"}
            placeholder="nama@kantor.id"
            className="mt-1.5 min-h-[44px]"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "login-email-error" : undefined}
          />
          <FieldError id="login-email-error" message={emailError} />
        </div>
        <div>
          <label htmlFor="login-password" className="text-[12px] text-[var(--color-muted)]">
            Kata sandi
          </label>
          <div className="relative mt-1.5">
            <Input
              id="login-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="minimal 8 karakter"
              className="min-h-[44px] pr-12"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "login-password-error" : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute top-1/2 right-1 min-h-[44px] -translate-y-1/2 px-2.5"
            >
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </Button>
          </div>
          <FieldError id="login-password-error" message={passwordError} />
        </div>
        <Button type="submit" disabled={busy} className="min-h-[48px] active:translate-y-px">
          {busy ? "Tunggu…" : mode === "login" ? "Masuk" : "Daftar dan masuk"}
        </Button>
      </form>
    </div>
  );
}
