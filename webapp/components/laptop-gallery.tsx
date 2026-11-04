"use client";

import { useEffect, useRef, useState } from "react";
import type { Sketch } from "../lib/sketches";
import { LaptopStage } from "./laptop-stage";

/* Galeri scrollytelling: daftar 14 sketch di satu sisi, laptop statis
   menempel di sisi lain. Layar laptop berganti mengikuti langkah yang
   sedang dibaca. */

export function LaptopGallery({ sketches }: { sketches: Sketch[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el || !barRef.current) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      barRef.current.style.width = `${p * 100}%`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number((e.target as HTMLElement).dataset.i);
          // Debounce: abaikan flip cepat di batas antar-langkah.
          window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setActive(i), 120);
        });
      },
      { rootMargin: "-35% 0px -35% 0px" }
    );
    stepRefs.current.forEach((el) => {
      if (el) io.observe(el);
    });
    return () => {
      io.disconnect();
      window.clearTimeout(timerRef.current);
    };
  }, [sketches.length]);

  const cur = sketches[active] ?? sketches[0];
  if (!cur) return null;

  return (
    <div ref={wrapRef} className="mt-12">
      {/* Mobile: sticky menempel di luar grid agar punya ruang gerak penuh. */}
      <div className="sticky top-0 z-10 -mx-4 bg-[var(--v-bg)] px-4 py-2 lg:hidden">
        <div className="aspect-[1403/848] w-full">
          <LaptopStage code={cur.code} html={cur.html} filename={`${cur.slug}.ino`} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <p className="tnum shrink-0 font-mono2 text-[12px] text-[var(--v-muted)]" style={{ fontFamily: "var(--font-variant)" }}>
            {cur.num} / 14
          </p>
          <div className="h-[2px] flex-1 bg-[var(--v-border)]" aria-hidden="true">
            <div ref={barRef} className="h-full bg-[var(--v-accent)]" style={{ width: "0%" }} />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-10 lg:mt-0 lg:grid-cols-2 [&>*]:min-w-0">
      <ol className="order-2 min-w-0 lg:order-1">
        {sketches.map((s, i) => (
          <li
            key={s.slug}
            data-i={i}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            aria-current={i === active ? "true" : undefined}
            className={`flex min-h-[42vh] flex-col justify-center border-l-2 py-8 pl-6 transition-opacity lg:min-h-[52vh] ${
              i === active ? "border-[var(--v-accent)] opacity-100" : "border-[var(--v-border)] opacity-50"
            }`}
          >
            <p className="tnum font-mono2 text-[13px] text-[var(--v-muted)]" style={{ fontFamily: "var(--font-variant)" }}>
              {s.num} / 14 . {s.lines} baris
            </p>
            <p className="font-display-em mt-2 text-[clamp(28px,3vw,44px)]">{s.title}</p>
            <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-[var(--v-muted)]">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="order-1 hidden min-w-0 lg:order-2 lg:block">
        <div className="lg:sticky lg:top-20">
          <div className="aspect-[1403/848] w-full">
            <LaptopStage code={cur.code} html={cur.html} filename={`${cur.slug}.ino`} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
