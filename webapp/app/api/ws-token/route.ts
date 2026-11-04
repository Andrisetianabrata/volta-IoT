import { NextResponse } from "next/server";
import { sessionToken } from "@/lib/auth";

/* GET /api/ws-token — token untuk query ?token= pada WebSocket /stream.
   Token hanya hidup di memori klien saat membuka stream, jangan simpan
   di localStorage. */
export async function GET() {
  const token = await sessionToken();
  if (!token) {
    return NextResponse.json({ error: { code: "NO_SESSION", message: "Belum masuk. Silakan login dulu." } }, { status: 401 });
  }
  return NextResponse.json({ token });
}
