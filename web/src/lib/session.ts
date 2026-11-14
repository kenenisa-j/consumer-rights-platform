import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLES, type PortalKey, type RoleKey } from "@consumer-rights/contracts";

/** The signed-in person, as the backend reports it (`GET /api/me`). Read on the server from the session cookie. */
export interface Me {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  preferredLanguage: string;
  roles: RoleKey[];
  office: { id: string; code: string; nameEn: string; nameAm: string; level: "bureau" | "subcity" | "woreda" } | null;
  business: { id: string; tradeName: string } | null;
}

export const API_URL = process.env.API_INTERNAL_URL || "http://127.0.0.1:4300";

export { LANDING_PATHS as LANDING } from "./landing";

export async function getMe(): Promise<Me | null> {
  const jar = await cookies();
  if (jar.getAll().length === 0) return null;
  try {
    const res = await fetch(`${API_URL}/api/me`, { headers: { cookie: jar.toString() }, cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json() as { ok: boolean; data?: Me };
    return body.ok && body.data ? body.data : null;
  } catch {
    return null; // API down: treated as signed out, never as signed in
  }
}

export function portalOf(me: Me): PortalKey | null {
  const role = me.roles.find(r => ROLES[r]);
  return role ? ROLES[role].portal : null;
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
}

/**
 * Gate for a page or layout. Not signed in: go to sign-in and come back. Signed in to a different portal: say so.
 * This is a convenience for the person; the API still checks every request on its own.
 */
export async function requirePortal(portal: PortalKey, returnTo: string): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  if (portalOf(me) !== portal) redirect(`/no-access?area=${portal}`);
  return me;
}
