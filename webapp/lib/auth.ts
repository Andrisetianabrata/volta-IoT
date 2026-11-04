import { cookies } from "next/headers";

/* Bantuan auth sisi server: cookie sesi httpOnly + panggil API VOLTA.
   Hanya diimpor dari Server Component / Route Handler. */

export const SESSION_COOKIE = "volta-session";
const SESSION_MAX_AGE = 30 * 86400; // ikut kedaluwarsa sesi server

export function apiBase(): string {
  return (process.env.VOLTA_API_URL ?? "http://127.0.0.1:9443").replace(/\/+$/, "");
}

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export type UpstreamError = { code: string; message: string };

export async function upstream(
  path: string,
  init: { method?: string; body?: unknown; token?: string; rawBody?: ArrayBuffer; contentType?: string | null }
): Promise<{ ok: true; status: number; json: unknown } | { ok: false; status: number; error: UpstreamError }> {
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      method: init.method ?? "GET",
      headers: {
        ...(init.contentType ? { "content-type": init.contentType } : init.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
      body:
        init.rawBody !== undefined
          ? init.rawBody
          : init.body !== undefined
            ? JSON.stringify(init.body)
            : undefined,
    });
  } catch {
    return { ok: false, status: 502, error: { code: "UPSTREAM_DOWN", message: "Server VOLTA. tidak terjangkau. Pastikan server jalan." } };
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json as { error?: UpstreamError } | null)?.error;
    return {
      ok: false,
      status: res.status,
      error: { code: err?.code ?? "UPSTREAM", message: err?.message ?? `Server menjawab ${res.status}.` },
    };
  }
  return { ok: true, status: res.status, json };
}
