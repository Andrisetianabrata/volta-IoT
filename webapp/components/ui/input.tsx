import * as React from "react"
import { cn } from "cn"

/* VOLTA input: flat surface, 1px control border, copper focus border. No ring glow. */

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      style={{ borderRadius: "var(--radius)", ...style }}
      className={cn(
        "min-h-[44px] w-full min-w-0 border border-[var(--color-control)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-text)] transition-colors outline-none placeholder:text-[var(--color-faint)] hover:border-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#C4242A]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
