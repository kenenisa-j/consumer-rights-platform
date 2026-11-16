import { cookies } from "next/headers";
import { API_URL } from "./session";

/**
 * Server side read of the API, with the visitor's session cookie. Returns the data, or null when the API refuses or is down
 * (a page then shows its "could not load" state, never an empty list that looks like "you have nothing").
 */
export async function serverGet<T>(path: string, opts: { auth?: boolean } = {}): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (opts.auth !== false) { const jar = await cookies(); if (jar.getAll().length) headers.cookie = jar.toString(); }
    const res = await fetch(`${API_URL}/api${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const body = await res.json() as { ok: boolean; data?: T };
    return body.ok ? (body.data as T) : null;
  } catch { return null; }
}
