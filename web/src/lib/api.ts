// Browser side of every call to the API. It goes through the site's own address (see next.config.mjs), so the session cookie
// travels with it and is never readable by scripts. Every call has a timeout, and failures come back as a value, not a throw.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; fields?: Record<string, string> };

export const NETWORK_ERROR = "We could not reach the service. Check your connection and try again.";

async function call<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, ms = 15000): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(path, {
      method, credentials: "same-origin", signal: ctl.signal, cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json().catch(() => null) as { ok?: boolean; data?: T; error?: { message?: string; fields?: Record<string, string> }; message?: string } | null;
    if (res.ok && json?.ok) return { ok: true, data: json.data as T };
    const error = json?.error?.message ?? (res.status >= 500 ? "The service had a problem. Try again in a moment." : "That did not work. Check your answers and try again.");
    return { ok: false, status: res.status, error, fields: json?.error?.fields };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  } finally { clearTimeout(timer); }
}

export const apiGet = <T>(path: string) => call<T>("GET", path);
export const apiPost = <T>(path: string, body: unknown) => call<T>("POST", path, body);
export const apiPatch = <T>(path: string, body: unknown = {}) => call<T>("PATCH", path, body);
