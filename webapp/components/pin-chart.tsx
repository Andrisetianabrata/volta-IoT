"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { niceCeil, type PinPoint } from "../lib/chart-scale";

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number | string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono2 text-[13px]"
      style={{ borderRadius: "var(--radius)" }}
    >
      <span className="tnum">{payload[0].value} ADC</span>
      <span className="ml-2 text-[var(--color-muted)]">{label}</span>
    </div>
  );
}

export function PinChart({
  data,
  label,
  line = "#C07A24",
  grid,
  tick,
}: {
  data: PinPoint[];
  label: string;
  line?: string;
  grid?: string;
  tick?: string;
}) {
  const [theme, setTheme] = useState("light");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onTheme = (e: Event) => setTheme((e as CustomEvent<string>).detail);
    window.addEventListener("volta-theme", onTheme);
    return () => window.removeEventListener("volta-theme", onTheme);
  }, []);

  if (!data.length) {
    return (
      <div
        role="img"
        aria-label={`${label}: belum ada sampel`}
        className="flex h-[160px] items-center border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[15px] text-[var(--color-muted)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        Belum ada sampel pada rentang ini.
      </div>
    );
  }

  const dark = theme === "dark";
  const gridC = grid ?? (dark ? "#1C1C1F" : "#EFEBE2");
  const tickC = tick ?? (dark ? "#A8A8AB" : "#5F6368");
  const top = niceCeil(Math.max(...data.map((d) => d.v)));
  const floor = Math.max(0, Math.floor((Math.min(...data.map((d) => d.v)) - 60) / 100) * 100);
  const short = (v: number) => (v >= 1000 ? `${(Math.round(v / 100) / 10).toString().replace(".0", "")}k` : `${v}`);

  return (
    <div role="img" aria-label={label} className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} accessibilityLayer margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridC} vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: tickC, fontSize: 12, fontFamily: "var(--font-mono2)" }}
            tickLine={false}
            axisLine={{ stroke: gridC }}
            minTickGap={48}
          />
          <YAxis
            domain={[floor, top]}
            tick={{ fill: tickC, fontSize: 12, fontFamily: "var(--font-mono2)" }}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            tickFormatter={short}
            width={48}
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: gridC }} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={line}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: line, stroke: line }}
            isAnimationActive={!reduced}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
