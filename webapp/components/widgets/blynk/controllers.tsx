"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, Minus, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BlynkCard } from "./shell";

const DAYS = ["S", "S", "R", "K", "J", "S", "M"];

// PUSH button: active while held.
export function PushButtonWidget() {
  const [active, setActive] = useState(false);
  return (
    <BlynkCard name="Button · push" pin="relay">
      <Button
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerLeave={() => setActive(false)}
        className={cn(
          "h-16 w-full rounded-2xl text-base font-bold",
          active
            ? "bg-[#C07A24] text-white hover:bg-[#C07A24]"
            : "bg-[#111111] text-white hover:bg-black dark:bg-white dark:text-black",
        )}
      >
        <Power className="size-5" />
        {active ? "ON" : "OFF"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Hold to send 1, release to send 0
      </p>
    </BlynkCard>
  );
}

// Styled button: latched toggle with icon + label.
export function StyledButtonWidget() {
  const [on, setOn] = useState(true);
  return (
    <BlynkCard name="Styled button · switch" pin="lamp">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOn((v) => !v)}
        className={cn(
          "flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-colors",
          on
            ? "bg-[#111111] text-white dark:bg-white dark:text-black"
            : "bg-black/[0.06] text-muted-foreground dark:bg-white/10",
        )}
      >
        <Lightbulb className={cn("size-5", on && "fill-[#C07A24] text-[#C07A24]")} />
        Lamp {on ? "ON" : "OFF"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground tabular-nums">
        Writes {on ? 1 : 0} on tap
      </p>
    </BlynkCard>
  );
}

// Horizontal slider 0–100.
export function HSliderWidget() {
  const [v, setV] = useState([60]);
  return (
    <BlynkCard name="Slider" pin="pwm">
      <p className="text-4xl font-medium tabular-nums">{v[0]}</p>
      <Slider
        value={v}
        onValueChange={(nv) => setV(nv as number[])}
        min={0}
        max={100}
        aria-label="Dimmer level"
        className="mt-4 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-black/[0.08] [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-thumb]]:shadow-md dark:[&_[data-slot=slider-track]]:bg-white/15"
      />
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>0</span>
        <span>100</span>
      </div>
    </BlynkCard>
  );
}

// Vertical slider.
export function VSliderWidget() {
  const [v, setV] = useState([40]);
  return (
    <BlynkCard name="Slider · vertical" pin="valve">
      <div className="flex flex-1 items-center justify-center gap-4 py-2">
        <Slider
          orientation="vertical"
          value={v}
          onValueChange={(nv) => setV(nv as number[])}
          min={0}
          max={100}
          aria-label="Vertical level"
          className="h-44 [&_[data-slot=slider-track]]:w-2 [&_[data-slot=slider-track]]:bg-black/[0.08] [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-thumb]]:shadow-md dark:[&_[data-slot=slider-track]]:bg-white/15"
        />
        <p className="text-4xl font-medium tabular-nums">{v[0]}</p>
      </div>
    </BlynkCard>
  );
}

// Step control: − / + with step readout.
export function StepWidget() {
  const [v, setV] = useState(4);
  return (
    <BlynkCard name="Step control" pin="dose">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Step down"
          onClick={() => setV((x) => Math.max(0, x - 1))}
          className="size-12 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Minus className="size-5" />
        </Button>
        <p className="text-5xl font-medium tabular-nums">{v}</p>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Step up"
          onClick={() => setV((x) => Math.min(10, x + 1))}
          className="size-12 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Plus className="size-5" />
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground tabular-nums">
        Step 1 · loop values
      </p>
    </BlynkCard>
  );
}

// Joystick: drag knob, reports X/Y −100…100.
export function JoystickWidget() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);

  const move = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const R = r.width / 2 - 24;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setPos({ x: Math.round((dx / R) * 100), y: Math.round((-dy / R) * 100) });
  };

  return (
    <BlynkCard name="Joystick" pin="joy_x · joy_y">
      <div
        ref={ref}
        role="slider"
        aria-label="Joystick X Y"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={pos.x}
        aria-valuetext={`${pos.x}, ${pos.y}`}
        tabIndex={0}
        onPointerDown={(e) => {
          setDrag(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          move(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => drag && move(e.clientX, e.clientY)}
        onPointerUp={() => {
          setDrag(false);
          setPos({ x: 0, y: 0 });
        }}
        onKeyDown={(e) => {
          const s = 10;
          if (e.key === "ArrowUp") setPos((p) => ({ ...p, y: Math.min(100, p.y + s) }));
          if (e.key === "ArrowDown") setPos((p) => ({ ...p, y: Math.max(-100, p.y - s) }));
          if (e.key === "ArrowLeft") setPos((p) => ({ ...p, x: Math.max(-100, p.x - s) }));
          if (e.key === "ArrowRight") setPos((p) => ({ ...p, x: Math.min(100, p.x + s) }));
        }}
        className="relative mx-auto size-44 cursor-grab touch-none rounded-full bg-black/[0.05] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/[0.07]"
      >
        <span className="absolute top-1/2 right-3 left-3 h-px bg-black/10 dark:bg-white/10" />
        <span className="absolute top-3 bottom-3 left-1/2 w-px bg-black/10 dark:bg-white/10" />
        <span
          className="absolute top-1/2 left-1/2 size-12 rounded-full bg-[#111111] shadow-lg dark:bg-white"
          style={{
            transform: `translate(calc(-50% + ${pos.x * 0.52}px), calc(-50% + ${-pos.y * 0.52}px))`,
          }}
        />
      </div>
      <p className="mt-3 text-center font-mono text-xs tabular-nums">
        X {pos.x >= 0 ? "+" : ""}
        {pos.x} · Y {pos.y >= 0 ? "+" : ""}
        {pos.y}
      </p>
    </BlynkCard>
  );
}

// zeRGBa: three channel sliders + merged preview.
export function ZeRGBaWidget() {
  const [r, setR] = useState([192]);
  const [g, setG] = useState([122]);
  const [b, setB] = useState([36]);
  const hex = `#${[r[0], g[0], b[0]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  const rows = [
    { label: "R", value: r, set: setR, bar: "bg-red-500" },
    { label: "G", value: g, set: setG, bar: "bg-green-500" },
    { label: "B", value: b, set: setB, bar: "bg-blue-500" },
  ];
  return (
    <BlynkCard name="zeRGBa" pin="rgb">
      <div
        className="h-14 rounded-2xl border border-black/10"
        style={{ background: hex }}
        aria-label={`Preview color ${hex}`}
      />
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-3 text-xs font-bold">{row.label}</span>
            <Slider
              value={row.value}
              onValueChange={(nv) => row.set(nv as number[])}
              min={0}
              max={255}
              aria-label={`${row.label} channel`}
              className={cn(
                "[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-4",
                row.bar === "bg-red-500" && "[&_[data-slot=slider-range]]:bg-red-500",
                row.bar === "bg-green-500" && "[&_[data-slot=slider-range]]:bg-green-500",
                row.bar === "bg-blue-500" && "[&_[data-slot=slider-range]]:bg-blue-500",
              )}
            />
            <span className="w-8 text-right font-mono text-xs tabular-nums">
              {row.value[0]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
        {hex}
      </p>
    </BlynkCard>
  );
}

// Timer: start time, active days, action + enable.
export function TimerWidget() {
  const [days, setDays] = useState([true, true, true, true, true, false, false]);
  const [enabled, setEnabled] = useState(true);
  return (
    <BlynkCard name="Timer" pin="sched">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="timer-start">Start time</Label>
          <Input id="timer-start" type="time" defaultValue="06:30" className="h-11 rounded-2xl" />
        </div>
        <div className="grid gap-1.5">
          <Label>Active days</Label>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={days[i]}
                onClick={() =>
                  setDays((prev) => prev.map((x, j) => (j === i ? !x : x)))
                }
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  days[i]
                    ? "bg-[#111111] text-white dark:bg-white dark:text-black"
                    : "bg-black/[0.06] text-muted-foreground dark:bg-white/10",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.06]">
          <span className="text-sm font-medium">Turn lamp ON</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Timer enabled" />
        </div>
      </div>
    </BlynkCard>
  );
}

// RTC: live device clock preview from the client clock.
export function RtcWidget() {
  const [now, setNow] = useState("--:--:--");
  const [date, setDate] = useState("···");

  useEffect(() => {
    const f = () => {
      const n = new Date();
      setNow(n.toLocaleTimeString("en-GB"));
      setDate(
        n.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        }),
      );
    };
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <BlynkCard name="RTC" pin="clock">
      <p className="text-5xl font-medium tracking-tight tabular-nums">{now}</p>
      <p className="mt-1 text-sm text-muted-foreground">{date}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Syncs hardware clock on connect
      </p>
    </BlynkCard>
  );
}
