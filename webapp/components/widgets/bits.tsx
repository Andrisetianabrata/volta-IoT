"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Small paper tag like OPTIMAL / GOOD / PARKED in the reference.
export function StatusChip({
  tone = "paper",
  className,
  children,
}: {
  tone?: "paper" | "copper";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "rounded-md border-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "paper" &&
          "bg-black/[0.07] text-foreground dark:bg-white/10",
        tone === "copper" && "bg-[#C07A24]/15 text-[#8a5a1c] dark:text-[#e0a75e]",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

// Decorative dot grid from the report reference.
export function DotMatrix({
  rows = 4,
  cols = 10,
  filled = 14,
  className,
}: {
  rows?: number;
  cols?: number;
  filled?: number;
  className?: string;
}) {
  const total = rows * cols;
  return (
    <div
      aria-hidden="true"
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1 rounded-full",
            i < filled ? "bg-foreground" : "bg-foreground/15",
          )}
        />
      ))}
    </div>
  );
}

// Chevron list row: Charge limit 80% >, Tire pressure Normal >
export function ControlRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl px-1 py-2.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        {value}
        <ChevronRight className="size-4" />
      </span>
    </button>
  );
}

// Segmented pill tabs (Bedroom / Living room, Weekly / Monthly).
export function SegmentedControl({
  options,
  value,
  onValueChange,
  ariaLabel,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} aria-label={ariaLabel}>
      <TabsList className="h-11 w-full rounded-full bg-black/[0.06] p-1.5 dark:bg-white/10">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className="h-full flex-1 rounded-full text-[13px] font-semibold text-muted-foreground data-active:bg-white data-active:text-foreground data-active:shadow-[0_4px_12px_-4px_rgba(17,17,17,0.3)] dark:data-active:bg-[#1e1e22]"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
