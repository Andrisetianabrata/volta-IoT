import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie, upstream } from "@/lib/auth";

/* POST /api/auth/login | /api/auth/register
   Login menyimpan sesi di cookie httpOnly. Register langsung login
   otomatis dengan kredensial yang sama. */

function validBody(b: unknown): b is { email: string; password: string } {
  if (typeof b !== "object" || b === null) return false;
  const { email, password } = b as { email?: unknown; password?: unknown };
  return typeof email === "string" && email.includes("@") && typeof password === "string" && password.length >= 8;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action !== "login" && action !== "register") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Aksi tak dikenal." } }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (!validBody(body)) {
    return NextResponse.json(
      { error: { code: "INVALID", message: "Isi email valid dan kata sandi minimal 8 karakter." } },
      { status: 400 }
    );
  }
  if (action === "register") {
    const reg = await upstream("/auth/register", { method: "POST", body });
    if (!reg.ok) {
      const message = reg.error.code === "EXISTS" ? "Email sudah terdaftar. Silakan masuk." : reg.error.message;
      return NextResponse.json({ error: { code: reg.error.code, message } }, { status: reg.status });
    }
  }
  const login = await upstream("/auth/login", { method: "POST", body });
  if (!login.ok) {
    return NextResponse.json({ error: login.error }, { status: login.status });
  }
  const token = (login.json as { token?: string } | null)?.token;
  if (!token) {
    return NextResponse.json({ error: { code: "UPSTREAM", message: "Server tidak mengembalikan token." } }, { status: 502 });
  }
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
