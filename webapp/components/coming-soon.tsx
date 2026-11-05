/* Placeholder jujur untuk tab yang belum dibangun (R-24/R-26):
   tujuan ada, label "Segera hadir" terlihat, logika menyusul di task-nya.
   Gaya: DESIGN-APP.md §5-6 (Card 8px). */

import { Card } from "@/components/ui/card";

export function ComingSoon({ task, desc }: { task: string; desc: string }) {
  return (
    <section aria-label="Segera hadir">
      <Card>
      {/* TODO: ganti placeholder ini saat {task} dikerjakan */}
      <p className="inline-block border border-[var(--color-border)] px-2.5 py-1 font-mono2 text-[12px] text-[var(--color-muted)]" style={{ borderRadius: "var(--radius)" }}>
        Segera hadir · {task}
      </p>
      <p className="mt-3 text-[15px] text-[var(--color-muted)]">{desc}</p>
      </Card>
    </section>
  );
}

export function PageHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-text)]">{title}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-[var(--color-muted)]">{desc}</p>
    </div>
  );
}
