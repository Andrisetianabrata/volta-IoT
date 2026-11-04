"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { saveData?: boolean }).saveData) return;
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
