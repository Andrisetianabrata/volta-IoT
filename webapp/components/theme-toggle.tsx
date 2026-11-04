"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("volta-theme", next);
    } catch {
      /* abaikan */
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent("volta-theme", { detail: next }));
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      className="min-h-[44px]"
    >
      {theme === "dark" ? "Terang" : "Gelap"}
    </Button>
  );
}
