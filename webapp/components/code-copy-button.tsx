"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeCopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      aria-label={done ? "Kode disalin" : "Salin kode"}
      className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 border border-[var(--color-border)] bg-transparent px-2 text-[13px] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      style={{ borderRadius: "var(--radius)" }}
    >
      {done ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
      {done ? "Disalin" : "Salin"}
    </button>
  );
}
