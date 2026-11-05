import type { ReactNode } from "react";
import { cn } from "cn";

/* Cangkang widget kanvas (DESIGN-APP.md §5): Card 8px + header mono + isi. */

export function WidgetCard({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-ui className={cn("flex min-h-[120px] flex-col border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06)]", className)} style={{ borderRadius: "var(--radius)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono2 text-[13px] text-[var(--color-muted)]">{title}</p>
        {meta ? <p className="tnum font-mono2 text-[13px] text-[var(--color-faint)]">{meta}</p> : null}
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}
