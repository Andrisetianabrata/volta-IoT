"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

export function CtaForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Tulis alamat email yang valid agar tim bisa membalas.");
      return;
    }
    setError(null);
    const url = `mailto:halo@volta.local?subject=Minta%20akses%20VOLTA&body=${encodeURIComponent(`Halo tim VOLTA, saya (${email.trim()}) ingin mencoba di ESP32 saya.`)}`;
    window.location.href = url;
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <label htmlFor="cta-email" className="sr-only">
          Alamat email
        </label>
        <Input
          id="cta-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="nama@kantor.id"
          autoComplete="email"
          className="min-h-[44px]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cta-error" : undefined}
        />
        <FieldError id="cta-error" message={error} />
      </div>
      <Button type="submit" className="min-h-[44px] bg-[var(--color-accent)] text-[var(--accent-foreground)] hover:bg-[var(--color-accent)] hover:opacity-90">
        Kirim permintaan
      </Button>
    </form>
  );
}
