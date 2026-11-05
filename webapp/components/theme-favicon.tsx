"use client";

import { useEffect } from "react";

const LIGHT_HREF = "/volta-symbol.svg";
const DARK_HREF = "/volta-symbol-white.svg";

// Keeps the tab icon in sync with the OS color scheme at runtime:
// dark system -> white Bit Pair, light system -> ink Bit Pair.
// The SSR <link> already points at the adaptive /favicon.svg, so
// first paint is correct even before this effect runs.
export default function ThemeFavicon() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (dark: boolean) => {
      const selector =
        'link[rel="icon"][type="image/svg+xml"]';
      let link =
        document.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/svg+xml";
        document.head.appendChild(link);
      }
      link.href = dark ? DARK_HREF : LIGHT_HREF;
    };

    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
