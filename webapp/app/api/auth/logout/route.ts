import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/* POST /api/auth/logout — hapus cookie sesi.
   Catatan: server tidak punya endpoint logout, sesi di server tetap
   berlaku sampai kedaluwarsa (30 hari), tapi klien tak lagi memakainya. */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
