"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CommandDemo() {
  const [text, setText] = useState("V0 = 1820");
  const [sent, setSent] = useState<string | null>(null);

  const m = text.match(/^(V\d+)\s*=\s*(\d+)\s*$/i);

  return (
    <div data-ui className="w-full max-w-[560px]">
      <label htmlFor="cmd-demo" className="font-mono2 text-[13px] text-[var(--color-muted)]">
        Ketik perintah pin, contoh V0 = 1820
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="cmd-demo"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSent(null);
          }}
          className="tnum min-h-[44px] font-mono2"
          spellCheck={false}
          autoComplete="off"
        />
        <Button
          type="button"
          className="min-h-[44px] shrink-0 bg-[var(--color-primary)] text-[var(--primary-foreground)] hover:bg-[var(--color-primary)] hover:opacity-85"
          onClick={() => {
            if (m) setSent(`Antrian tulis ${m[1].toUpperCase()} = ${m[2]}. Di app, ini terkirim via PUT /pins/${m[1].toUpperCase()}.`);
            else setSent("Format belum dikenal. Pakai pola PIN = angka, contoh V0 = 1820.");
          }}
        >
          Tulis pin
        </Button>
      </div>
      <div aria-live="polite" className="mt-3 min-h-[44px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[15px]">
        {sent ?? (m ? `Siap tulis ${m[1].toUpperCase()} = ${m[2]}.` : "Menunggu format PIN = angka.")}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["V0 = 1820", "V1 = 1", "V2 = 640"].map((ex) => (
          <Button key={ex} type="button" variant="outline" className="tnum min-h-[44px] font-mono2 text-[13px]" onClick={() => { setText(ex); setSent(null); }}>
            {ex}
          </Button>
        ))}
      </div>
    </div>
  );
}
