"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

/* Strip pin live (simulasi demo berlabel). Jeda saat reduced-motion atau hover. */

const BASE = [
  { pin: "V0", val: "1827", unit: "ADC" },
  { pin: "V1", val: "1", unit: "" },
  { pin: "V2", val: "640", unit: "ADC" },
  { pin: "V3", val: "basi", unit: "40 dtk" },
];

export function PinTicker() {
  const [vals, setVals] = useState(BASE);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) return;
    const id = setInterval(() => {
      setVals((v) =>
        v.map((r) =>
          r.pin === "V0" ? { ...r, val: String(1790 + Math.floor(Math.random() * 70)) } : r
        )
      );
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const row = (key: string) => (
    <span key={key} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={key === "b"}>
      {vals.map((r) => (
        <span key={`${key}-${r.pin}`} className="tnum inline-flex items-baseline gap-2 font-mono2 text-[14px]">
          <span className="text-[var(--color-muted)]">{r.pin}</span>
          <span className="text-[var(--color-text)]">{r.val}</span>
          {r.unit && <span className="text-[var(--color-faint)]">{r.unit}</span>}
        </span>
      ))}
      <Badge dot={true}>demo</Badge>
    </span>
  );

  return (
    <div className="ticker overflow-hidden bg-[var(--color-surface)]" role="marquee" aria-label="Contoh nilai pin (simulasi demo)">
      {reduced ? (
        <div className="mx-auto flex w-full max-w-6xl items-center gap-8 overflow-x-auto px-4 py-3 sm:px-6">{row("static")}</div>
      ) : (
        <div className="ticker-track flex w-max py-3">
          {row("a")}
          {row("b")}
        </div>
      )}
    </div>
  );
}
