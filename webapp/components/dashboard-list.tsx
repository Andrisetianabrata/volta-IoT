"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dashboard } from "@/lib/api";
import { createDashboardAction, deleteDashboardAction } from "@/lib/actions";

/* Daftar board: baris 56px (nama + meta + chevron), hover tint.
   Buat + hapus dua tahap. Tanpa sesi tak sampai sini. */

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
      <form action={createForm} className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor="board-name" className="font-mono2 text-[12px] text-[var(--color-muted)]">
            Nama board baru
          </label>
          <Input id="board-name" name="name" maxLength={80} placeholder="cth. Ruang Server" className="mt-1" />
        </div>
        <Button type="submit" disabled={creating} className="min-h-[44px] sm:self-end">
          {creating ? "Membuat…" : "Buat board"}
        </Button>
      </form>
      {createState?.error ? (
        <p role="alert" className="mt-2 text-[15px] text-[var(--color-text)]">
          {createState.error}
        </p>
      ) : null}
      {initial.length === 0 ? (
        <section aria-label="Belum ada board" className="mt-6">
          <p className="text-[20px] font-semibold text-[var(--color-text)]">Belum ada board.</p>
          <p className="mt-2 max-w-xl text-[15px] text-[var(--color-muted)]">
            Buat board pertama lewat formulir di atas, atau jalankan server dev dengan VOLTA_SEED_DEMO=1 untuk contoh
            siap lihat.
          </p>
        </section>
      ) : (
        <ul className="mt-6">
          {initial.map((d) => (
            <li key={d.id}>
              <div className="group flex min-h-[56px] items-center gap-3">
                <Link
                  href={`/dashboards/${encodeURIComponent(d.id)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-1 hover:bg-[var(--color-accent-tint)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="min-w-0 flex-1 py-2">
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
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)]"
                >
                  <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                  {arming === d.id ? <span className="pr-2 text-[14px] font-semibold">Yakin?</span> : null}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {delError ? (
        <p role="alert" className="mt-2 text-[15px] text-[var(--color-text)]">
          {delError}
        </p>
      ) : null}
    </div>
  );
}
