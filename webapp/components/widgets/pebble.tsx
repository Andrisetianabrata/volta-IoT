import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Pebble theme shell: white card, 28px radius, hairline border,
// single soft diffused shadow. Dark mode falls back to raised surface.
export function PebbleCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "rounded-[28px] border-black/[0.06] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(17,17,17,0.25)]",
        "dark:border-white/10 dark:bg-[#131316] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function MicroLabel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
