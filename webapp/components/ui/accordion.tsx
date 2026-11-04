"use client"

import * as React from "react"
import { cn } from "cn"
import { Accordion as AccordionPrimitive } from "radix-ui"

/* VOLTA accordion: filled tiles, plus/minus drawn from two bars (Bit motif). No chevrons, no hairlines. */

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  style,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      style={{ borderRadius: "var(--radius)", ...style }}
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-surface)] px-4 transition-colors data-[state=open]:border-[var(--color-accent)]",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex min-h-[64px] flex-1 cursor-pointer items-center justify-between gap-4 py-3 text-left text-[18px] font-medium text-[var(--color-text)] outline-none hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50 [&_span.mark]:ml-auto",
          className
        )}
        {...props}
      >
        {children}
        <span aria-hidden="true" className="mark relative inline-block size-4 shrink-0">
          <span className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-[var(--color-accent)]" />
          <span className="absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 bg-[var(--color-accent)] transition-transform group-data-[state=open]:rotate-90" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-[16px] text-[var(--color-muted)] data-[state=closed]:animate-none data-[state=open]:animate-[volta-rise_0.3s_ease-out]"
      {...props}
    >
      <div className={cn("max-w-[52ch] pt-1 pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
