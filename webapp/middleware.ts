import { NextResponse, type NextRequest } from "next/server";

/* Tandai rute app (shell) agar layout root bisa menyembunyikan header
   pemasaran di sana: tautan #fitur/#cara tidak ada di rute itu (R-24). */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|.*\\..*).*)"],
};
