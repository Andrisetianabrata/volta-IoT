"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Dashboard } from "@/lib/api";
import { createDashboardAction, deleteDashboardAction } from "@/lib/actions";

/* Daftar board (DESIGN-APP.md §6): form di Card, daftar sebagai satu Card
   dengan pemisah rule, hover tint + lift 2px. Hapus dua tahap. */

export function DashboardList({ initial }: { initial: Dashboard[] }) {
  const router = useRouter();
  const [createState, createForm, creating] = useActionState(createDashboardAction, null);
  const [arming, setArming] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  useEffect(() => {
    if (createState?.id) router.refresh();
  }, [createState?.id, router]);
  async function hapus(id: string) {
    if (arming !== id) {
      setArming(id);
      return;
    }
    setDelError(null);
    const r = await deleteDashboardAction(id);
    if (r.error) {
      setDelError(r.error);
      return;
    }
    setArming(null);
    router.refresh();
  }
  return (
    <div>
      <Card>
      <form action={createForm} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="board-name" className="font-mono2 text-[12px] text-[var(--color-muted)]">
            Nama board baru
          </label>
          <Input id="board-name" name="name" maxLength={80} placeholder="cth. Ruang Server" className="mt-1.5" />
        </div>
        <Button type="submit" disabled={creating} className="min-h-[44px] shrink-0 active:translate-y-px">
          {creating ? "Membuat…" : "Buat board"}
        </Button>
      </form>
      </Card>
      {createState?.error ? (
        <p role="alert" className="mt-3 border border-[#C4242A] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text)]" style={{ borderRadius: "var(--radius)" }}>
          {createState.error}
        </p>
      ) : null}
      {initial.length === 0 ? (
        <Card className="mt-4">
          <p className="text-[20px] font-semibold text-[var(--color-text)]">Belum ada board.</p>
          <p className="mt-2 max-w-xl text-[15px] text-[var(--color-muted)]">
            Buat board pertama lewat formulir di atas, atau jalankan server dev dengan VOLTA_SEED_DEMO=1 untuk contoh
            siap lihat.
          </p>
        </Card>
      ) : (
        <Card className="mt-4 p-2">
        <ul className="divide-y divide-[var(--color-rule)]">
          {initial.map((d) => (
            <li key={d.id}>
              <div className="group flex min-h-[64px] items-center gap-2 px-2 py-1 transition-[translate,background-color] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                <Link
                  href={`/dashboards/${encodeURIComponent(d.id)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 hover:bg-[var(--color-accent-tint)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block truncate text-[17px] font-semibold text-[var(--color-text)]">{d.name}</span>
                    <span className="tnum block font-mono2 text-[12px] text-[var(--color-muted)]">Buka kanvas</span>
                  </span>
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-[var(--color-faint)]" />
                </Link>
                <button
                  type="button"
                  onClick={() => hapus(d.id)}
                  onBlur={() => setArming(null)}
                  aria-label={arming === d.id ? `Yakin hapus ${d.name}? Klik lagi untuk hapus.` : `Hapus ${d.name}`}
                  style={{ borderRadius: "var(--radius)" }}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1 px-2 text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                >
                  <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                  {arming === d.id ? <span className="pr-1 text-[14px] font-semibold">Yakin?</span> : null}
                </button>
              </div>
            </li>
          ))}
        </ul>
        </Card>
      )}
      {delError ? (
        <p role="alert" className="mt-2 text-[15px] text-[var(--color-text)]">
          {delError}
        </p>
      ) : null}
    </div>
  );
}
