"use client";

import { Toaster as SonnerToaster } from "sonner";

/* Toaster sistem VOLTA (error sistem via toast, bukan inline).
   Tanpa next-themes: ikut data-theme lewat CSS var. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      gap={8}
      toastOptions={{
        style: {
          background: "var(--color-surface)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          fontSize: "14px",
        },
      }}
    />
  );
}
