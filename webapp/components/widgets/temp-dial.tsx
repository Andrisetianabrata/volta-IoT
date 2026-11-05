"use client";

import { useState } from "react";
import { Minus, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MicroLabel, PebbleCard } from "./pebble";

const MIN = 16;
const MAX = 30;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// 270° gauge arc from 135° to 405° (45°).
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// Circular temperature dial with tick ring and stepper controls.
export function TempDial() {
  const [value, setValue] = useState(22);
  const [on, setOn] = useState(true);
  const frac = (value - MIN) / (MAX - MIN);
  const end = 135 + frac * 270;

  return (
    <PebbleCard className="flex h-full flex-col items-center">
      <MicroLabel>Room control</MicroLabel>
      <div className="relative mt-2">
        <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={`Temperature ${value} degrees`}>
          {Array.from({ length: 41 }, (_, i) => {
            const deg = 135 + i * (270 / 40);
            const a = polar(110, 110, 96, deg);
            const b = polar(110, 110, i % 5 === 0 ? 86 : 90, deg);
            const active = deg <= end + 0.5;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "#111111" : "rgba(17,17,17,0.15)"}
                strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
          <path
            d={arcPath(110, 110, 68, 135, 405)}
            fill="none"
            stroke="rgba(17,17,17,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={arcPath(110, 110, 68, 135, end)}
            fill="none"
            stroke="#111111"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Cold
          </span>
          <span className="text-5xl font-medium tabular-nums">
            {value}°
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Decrease temperature"
          onClick={() => setValue((v) => Math.max(MIN, v - 1))}
          className="size-11 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          size="icon"
          aria-label="Toggle power"
          aria-pressed={on}
          onClick={() => setOn((v) => !v)}
          className={cn(
            "h-11 w-16 rounded-full",
            on
              ? "bg-[#111111] text-white hover:bg-black dark:bg-white dark:text-black"
              : "bg-black/[0.06] text-foreground hover:bg-black/10 dark:bg-white/10",
          )}
        >
          <Power className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Increase temperature"
          onClick={() => setValue((v) => Math.min(MAX, v + 1))}
          className="size-11 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground tabular-nums">
        {MIN}° – {MAX}° range
      </p>
    </PebbleCard>
  );
}
