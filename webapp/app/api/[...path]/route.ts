import { NextResponse, type NextRequest } from "next/server";
import { apiBase, sessionToken } from "@/lib/auth";

/* BFF proxy: teruskan ke API VOLTA. dengan header auth dari cookie httpOnly.
   Jalur /api/auth/* ditangani route khusus, bukan lewat sini. */

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.length === 0 || path[0] === "auth") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tidak ada." } }, { status: 404 });
  }
  const token = await sessionToken();
  if (!token) {
    return NextResponse.json({ error: { code: "NO_SESSION", message: "Belum masuk. Silakan login dulu." } }, { status: 401 });
  }
  const target = `${apiBase()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  let upstream: Response;
  try {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    const contentType = req.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_DOWN", message: "Server VOLTA. tidak terjangkau. Pastikan server jalan." } },
      { status: 502 }
    );
  }
  const buf = await upstream.arrayBuffer();
  const out = new NextResponse(buf, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) out.headers.set("content-type", ct);
  return out;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
