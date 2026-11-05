"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BlynkCard } from "./shell";

const HISTORY = [
  { t: "00", v: 21.2 }, { t: "02", v: 20.8 }, { t: "04", v: 20.4 },
  { t: "06", v: 20.9 }, { t: "08", v: 22.1 }, { t: "10", v: 23.4 },
  { t: "12", v: 24.8 }, { t: "14", v: 25.6 }, { t: "16", v: 25.1 },
  { t: "18", v: 23.9 }, { t: "20", v: 22.7 }, { t: "22", v: 21.9 },
];

// Value display: big reading + label + unit.
export function LabeledValueWidget() {
  return (
    <BlynkCard name="Value display" pin="temp">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Greenhouse temp
      </p>
      <p className="mt-1 text-6xl font-medium tracking-tight tabular-nums">
        24.8<span className="align-top text-2xl">°C</span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        Updated 3 s ago · /pin rate 1 s
      </p>
    </BlynkCard>
  );
}

// LED: glowing indicator with preview toggle.
export function LedWidget() {
  const [on, setOn] = useState(true);
  return (
    <BlynkCard name="LED" pin="pump">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "size-14 rounded-full transition-all",
            on
              ? "bg-[#C07A24] shadow-[0_0_24px_6px_rgba(192,122,36,0.55)]"
              : "bg-black/10 dark:bg-white/10",
          )}
        />
        <div>
          <p className="text-lg font-bold">{on ? "ON" : "OFF"}</p>
          <p className="text-xs text-muted-foreground">Pump relay</p>
        </div>
        <Switch
          checked={on}
          onCheckedChange={setOn}
          aria-label="LED preview toggle"
          className="ml-auto"
        />
      </div>
    </BlynkCard>
  );
}

// Gauge: 180° thick-arc dial with copper needle.
export function GaugeWidget() {
  const value = 68;
  const frac = value / 100;
  const R = 78;
  const cx = 100;
  const cy = 105;
  // frac 0 -> left end, frac 1 -> right end
  const nx = cx - R * Math.cos(Math.PI * frac) * 0.82;
  const ny = cy - R * Math.sin(Math.PI * frac) * 0.82;
  return (
    <BlynkCard name="Gauge" pin="soil">
      <svg viewBox="0 0 200 118" className="w-full" role="img" aria-label={`Gauge ${value} percent`}>
        <path
          d="M 22 105 A 78 78 0 0 1 178 105"
          fill="none"
          stroke="rgba(17,17,17,0.08)"
          strokeWidth="20"
          strokeLinecap="round"
          className="dark:stroke-white/10"
        />
        <path
          d="M 22 105 A 78 78 0 0 1 178 105"
          fill="none"
          stroke="#111111"
          strokeWidth="20"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value} 100`}
          className="dark:stroke-white"
        />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#C07A24" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="9" fill="#111111" className="dark:fill-white" />
      </svg>
      <p className="-mt-1 text-center text-5xl font-medium tracking-tight tabular-nums">
        {value}
        <span className="text-2xl">%</span>
      </p>
      <p className="mt-1 text-center text-sm text-muted-foreground">Soil moisture</p>
    </BlynkCard>
  );
}

// LCD: two-line mono display with backlight.
export function LcdWidget() {
  return (
    <BlynkCard name="LCD" pin="lcd">
      <div className="rounded-2xl bg-[#101408] p-4 font-mono text-[15px] leading-7 text-[#c8e06a] shadow-inner ring-1 ring-black/20">
        <p className="truncate">T:24.8C H:47%</p>
        <p className="truncate opacity-80">PUMP:ON  06:30</p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        print() to line 0 / line 1 · 16×2
      </p>
    </BlynkCard>
  );
}

// SuperChart / history graph: single copper line, no legend.
export function HistoryChartWidget() {
  return (
    <BlynkCard name="SuperChart · 24H" pin="temp" className="md:col-span-2">
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-medium tabular-nums">
          25.6<span className="text-lg text-muted-foreground">°C max</span>
        </p>
        <div className="flex gap-1.5">
          {(["1H", "24H"] as const).map((r) => (
            <span
              key={r}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                r === "24H"
                  ? "bg-[#111111] text-white dark:bg-white dark:text-black"
                  : "bg-black/[0.06] text-muted-foreground dark:bg-white/10",
              )}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 h-44 w-full text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={HISTORY} margin={{ top: 8, right: 4, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.25} vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} domain={[19, 27]} />
            <Tooltip
              formatter={(v) => [`${v} °C`, "Temp"]}
              labelFormatter={(l) => `${l}:00`}
              contentStyle={{ borderRadius: 12, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="v" stroke="#C07A24" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </BlynkCard>
  );
}

// Terminal: scrollback + local echo input.
export function TerminalWidget() {
  const [lines, setLines] = useState(["volta$ connected @ 115200", "suhu?", "suhu=24.8"]);
  const [draft, setDraft] = useState("");
  const send = () => {
    const cmd = draft.trim();
    if (!cmd) return;
    setLines((l) => [...l.slice(-7), `> ${cmd}`, `ok`]);
    setDraft("");
  };
  return (
    <BlynkCard name="Terminal" pin="cmd">
      <div className="h-32 overflow-y-auto rounded-2xl bg-[#111111] p-3 font-mono text-xs leading-5 text-white ring-1 ring-black/20 dark:bg-black dark:ring-white/10">
        {lines.map((l, i) => (
          <p key={i} className={cn(l.startsWith(">") ? "text-[#e0a75e]" : "text-white/85")}>
            {l}
          </p>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type command…"
          aria-label="Terminal command"
          className="h-10 rounded-2xl"
        />
        <Button size="icon" aria-label="Send command" onClick={send} className="size-10 shrink-0 rounded-2xl bg-[#111111] text-white hover:bg-black dark:bg-white dark:text-black">
          <Send className="size-4" />
        </Button>
      </div>
    </BlynkCard>
  );
}

// Level: segmented fill bar.
export function LevelWidget() {
  const value = 7;
  const max = 10;
  return (
    <BlynkCard name="Level" pin="tank">
      <p className="text-4xl font-medium tabular-nums">
        {value}
        <span className="text-lg text-muted-foreground">/{max}</span>
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-10 flex-1 rounded-md",
              i < value ? "bg-[#111111] dark:bg-white" : "bg-black/[0.08] dark:bg-white/10",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Water tank segments</p>
    </BlynkCard>
  );
}
