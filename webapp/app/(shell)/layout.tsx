import { redirect } from "next/navigation";
import { sessionToken } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

/* Shell app: guard sesi + sidebar/sheet. Tanpa topbar (Open plane):
   header tiap layar duduk langsung di atas ground. */

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const sesi = await sessionToken();
  if (!sesi) redirect("/login");
  return (
    <div className="flex min-h-svh bg-[var(--color-ground)] text-[var(--color-text)]">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-10 md:px-6">{children}</main>
      </div>
    </div>
  );
}
