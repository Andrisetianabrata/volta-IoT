"use client";

import { useState } from "react";
import { House, Layers, PieChart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PebbleCard } from "./pebble";

const ITEMS = [
  { value: "overview", label: "Overview", icon: House },
  { value: "spaces", label: "Spaces", icon: Layers },
  { value: "analytic", label: "Analytic", icon: PieChart },
  { value: "settings", label: "Settings", icon: Settings },
];

// Bottom tab bar from the report reference.
export function BottomNav() {
  const [active, setActive] = useState("overview");

  return (
    <PebbleCard className="flex h-full items-center justify-between px-4 py-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.value === active;
        return (
          <Button
            key={item.value}
            variant="ghost"
            onClick={() => setActive(item.value)}
            aria-pressed={isActive}
            className={cn(
              "flex h-auto flex-col items-center gap-1.5 rounded-2xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em]",
              isActive
                ? "bg-black/[0.06] text-foreground dark:bg-white/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Button>
        );
      })}
    </PebbleCard>
  );
}
