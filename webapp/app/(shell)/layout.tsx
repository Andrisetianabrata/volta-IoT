import { redirect } from "next/navigation";
import { sessionToken } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

/* Shell app (DESIGN-APP.md §6): guard sesi + sidebar. Header tiap layar
   duduk langsung di atas ground, tepi sama max-w-6xl. */

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const sesi = await sessionToken();
  if (!sesi) redirect("/login");
  return (
    <div className="flex min-h-svh bg-[var(--color-ground)] text-[var(--color-text)]">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-12 md:px-6">{children}</main>
      </div>
    </div>
  );
}
